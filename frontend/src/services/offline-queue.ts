export interface QueuedOfflineEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  department: string;
  timestamp: string;
  metadata: Record<string, any>;
  idempotencyKey: string;
}

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_COMPLETE';

class OfflineQueueManager {
  private queueKey = 'smartot_offline_events_queue';
  private listeners: Array<(state: SyncState, queueCount: number) => void> = [];
  private syncState: SyncState = navigator.onLine ? 'ONLINE' : 'OFFLINE';

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  public getSyncState(): SyncState {
    return this.syncState;
  }

  public getQueueCount(): number {
    return this.getQueue().length;
  }

  public subscribe(listener: (state: SyncState, queueCount: number) => void): () => void {
    this.listeners.push(listener);
    listener(this.syncState, this.getQueueCount());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const count = this.getQueueCount();
    this.listeners.forEach((l) => l(this.syncState, count));
  }

  private getQueue(): QueuedOfflineEvent[] {
    try {
      const raw = localStorage.getItem(this.queueKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedOfflineEvent[]): void {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.error('Failed to save offline queue to localStorage', e);
    }
  }

  public enqueueEvent(event: Omit<QueuedOfflineEvent, 'id' | 'timestamp' | 'idempotencyKey'>): QueuedOfflineEvent {
    const queue = this.getQueue();
    const queuedItem: QueuedOfflineEvent = {
      ...event,
      id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    };

    queue.push(queuedItem);
    this.saveQueue(queue);
    console.log(`[OfflineQueue] Queued event: ${queuedItem.eventType} (Total queued: ${queue.length})`);
    return queuedItem;
  }

  private handleOffline() {
    this.syncState = 'OFFLINE';
    this.notify();
  }

  private async handleOnline() {
    this.syncState = 'SYNCING';
    this.notify();
    await this.flushQueue();
  }

  public async flushQueue(): Promise<boolean> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      this.syncState = 'ONLINE';
      this.notify();
      return true;
    }

    this.syncState = 'SYNCING';
    this.notify();

    try {
      const token = localStorage.getItem('smartot_auth_token');
      const res = await fetch('/api/sync/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ events: queue }),
      });

      if (res.ok) {
        // Clear flushed queue
        localStorage.removeItem(this.queueKey);
        this.syncState = 'SYNC_COMPLETE';
        this.notify();
        setTimeout(() => {
          this.syncState = 'ONLINE';
          this.notify();
        }, 3000);
        return true;
      } else {
        this.syncState = 'OFFLINE';
        this.notify();
        return false;
      }
    } catch (err) {
      console.error('[OfflineQueue] Flush failed:', err);
      this.syncState = 'OFFLINE';
      this.notify();
      return false;
    }
  }
}

export const offlineQueue = new OfflineQueueManager();
