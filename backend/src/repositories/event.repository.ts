import { db } from '../database/db';
import { WorkflowEvent } from '../../../shared/src/types';

export class EventRepository {
  findAll(): WorkflowEvent[] {
    return [...db.getData().workflow_events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  findById(id: string): WorkflowEvent | undefined {
    return db.getData().workflow_events.find((e) => e.id === id);
  }

  findByEntity(entityId: string): WorkflowEvent[] {
    return db
      .getData()
      .workflow_events.filter((e) => e.entityId === entityId || e.metadata?.entityId === entityId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * FIX: Explicit idempotency key lookup for offline sync deduplication.
   * The sync controller uses this to detect and reject duplicate events
   * before attempting to apply them — rather than relying on the append()
   * method's silent deduplication.
   */
  findByIdempotencyKey(key: string): WorkflowEvent | undefined {
    return db.getData().workflow_events.find((e) => e.idempotencyKey === key);
  }

  /**
   * Find all events correlated to a surgery via explicit surgeryId in metadata.
   * Preferred over string matching. Used by correlation engine.
   */
  findBySurgeryId(surgeryId: string): WorkflowEvent[] {
    return db
      .getData()
      .workflow_events.filter(
        (e) =>
          e.entityId === surgeryId ||
          e.metadata?.surgeryId === surgeryId
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  append(event: WorkflowEvent): WorkflowEvent {
    const data = db.getData();
    // Check idempotency if key provided
    if (event.idempotencyKey) {
      const existing = data.workflow_events.find((e) => e.idempotencyKey === event.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    data.workflow_events.unshift(event);
    db.persist();
    return event;
  }
}

export const eventRepository = new EventRepository();
