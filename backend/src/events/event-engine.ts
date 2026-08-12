import { WorkflowEvent, WorkflowEventType } from '../../../shared/src/types';
import { eventRepository } from '../repositories/event.repository';

export type EventSubscriber = (event: WorkflowEvent) => void | Promise<void>;

export class WorkflowEventEngine {
  private static instance: WorkflowEventEngine;
  private subscribers: EventSubscriber[] = [];

  public static getInstance(): WorkflowEventEngine {
    if (!WorkflowEventEngine.instance) {
      WorkflowEventEngine.instance = new WorkflowEventEngine();
    }
    return WorkflowEventEngine.instance;
  }

  public subscribe(handler: EventSubscriber): () => void {
    this.subscribers.push(handler);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== handler);
    };
  }

  public async emitEvent(
    params: {
      eventType: WorkflowEventType;
      entityType: WorkflowEvent['entityType'];
      entityId: string;
      department: WorkflowEvent['department'];
      actorId: string;
      actorName: string;
      metadata?: Record<string, any>;
      idempotencyKey?: string;
    }
  ): Promise<WorkflowEvent> {
    const event: WorkflowEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      department: params.department,
      timestamp: new Date().toISOString(),
      actorId: params.actorId,
      actorName: params.actorName,
      metadata: params.metadata || {},
      idempotencyKey: params.idempotencyKey,
    };

    const savedEvent = eventRepository.append(event);

    // Asynchronously notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        await subscriber(savedEvent);
      } catch (err) {
        console.error('Error in event subscriber:', err);
      }
    }

    return savedEvent;
  }
}

export const eventEngine = WorkflowEventEngine.getInstance();
