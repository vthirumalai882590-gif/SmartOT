import { Response } from 'express';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class SyncController {
  public async syncEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { events } = req.body;
    const actor = req.user || { userId: 'offline_sync', email: 'offline@smartot.hospital', role: 'WARD_STAFF', department: 'Operations' };

    if (!Array.isArray(events)) {
      res.status(400).json({ success: false, error: 'INVALID_PAYLOAD', message: 'events array is required' });
      return;
    }

    const syncedResults: any[] = [];

    for (const item of events) {
      try {
        const savedEvent = await eventEngine.emitEvent({
          eventType: item.eventType,
          entityType: item.entityType || 'SYSTEM',
          entityId: item.entityId,
          department: item.department || 'WARD',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: { ...item.metadata, syncedFromOffline: true, clientTimestamp: item.timestamp },
          idempotencyKey: item.idempotencyKey || item.id,
        });

        syncedResults.push({
          clientEventId: item.id,
          serverEventId: savedEvent.id,
          status: 'SYNCED',
        });
      } catch (err: any) {
        syncedResults.push({
          clientEventId: item.id,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'OFFLINE_EVENT_BATCH_SYNC',
      entityType: 'SYNC_QUEUE',
      entityId: 'offline_sync_batch',
      newState: { batchCount: events.length, syncedCount: syncedResults.filter((r) => r.status === 'SYNCED').length },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        totalReceived: events.length,
        syncedCount: syncedResults.filter((r) => r.status === 'SYNCED').length,
        results: syncedResults,
      },
    });
  }
}

export const syncController = new SyncController();
