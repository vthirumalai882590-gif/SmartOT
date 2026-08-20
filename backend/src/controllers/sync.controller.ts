import { Response } from 'express';
import { eventEngine } from '../events/event-engine';
import { eventRepository } from '../repositories/event.repository';
import { otRepository } from '../repositories/ot.repository';
import { patientRepository } from '../repositories/patient.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { WorkflowEventType } from '../../../shared/src/types';

// Valid event types that offline clients can submit
const ALLOWED_OFFLINE_EVENT_TYPES = new Set<WorkflowEventType>([
  'PATIENT_ADMITTED',
  'READINESS_UPDATED',
  'CONSENT_VERIFIED',
  'TRANSFER_STARTED',
  'PATIENT_ARRIVED_OT',
  'CSSD_PACK_SCANNED',
  'CSSD_PACK_ASSIGNED',
  'CSSD_PACK_BLOCKED',
  'SURGERY_SCHEDULED',
  'SURGERY_STARTED',
  'SURGERY_COMPLETED',
  'TURNOVER_STARTED',
  'TURNOVER_COMPLETED',
  'OT_STATUS_CHANGED',
]);

export class SyncController {
  public async syncEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { events } = req.body;
    const actor = req.user || { userId: 'offline_sync', email: 'offline@smartot.hospital', role: 'WARD_STAFF', department: 'Operations' };

    if (!Array.isArray(events)) {
      res.status(400).json({ success: false, error: 'INVALID_PAYLOAD', message: 'events array is required' });
      return;
    }

    const syncedResults: Array<{
      clientEventId: string;
      serverEventId?: string;
      status: 'SYNCED' | 'DUPLICATE' | 'FAILED' | 'REJECTED';
      reason?: string;
    }> = [];

    for (const item of events) {
      const clientEventId = item.id || `unknown_${Date.now()}`;

      try {
        // FIX: Validate required fields
        if (!item.eventType) {
          syncedResults.push({ clientEventId, status: 'REJECTED', reason: 'Missing eventType' });
          continue;
        }

        // FIX: Validate event type is in allowed set
        if (!ALLOWED_OFFLINE_EVENT_TYPES.has(item.eventType as WorkflowEventType)) {
          syncedResults.push({
            clientEventId,
            status: 'REJECTED',
            reason: `Event type "${item.eventType}" is not allowed for offline sync`,
          });
          continue;
        }

        // FIX: Idempotency check — skip events that already exist by idempotency key
        const idempotencyKey = item.idempotencyKey || item.id;
        if (idempotencyKey) {
          const existing = eventRepository.findByIdempotencyKey(idempotencyKey);
          if (existing) {
            syncedResults.push({
              clientEventId,
              serverEventId: existing.id,
              status: 'DUPLICATE',
              reason: 'Event already synchronized',
            });
            continue;
          }
        }

        // FIX: Validate entity references exist when they matter
        if (item.metadata?.patientId) {
          const patient = patientRepository.findById(item.metadata.patientId);
          if (!patient) {
            syncedResults.push({
              clientEventId,
              status: 'REJECTED',
              reason: `Patient "${item.metadata.patientId}" referenced in event does not exist`,
            });
            continue;
          }
        }

        if (item.metadata?.surgeryId) {
          const surgery = otRepository.findSurgeryById(item.metadata.surgeryId);
          if (!surgery) {
            syncedResults.push({
              clientEventId,
              status: 'REJECTED',
              reason: `Surgery "${item.metadata.surgeryId}" referenced in event does not exist`,
            });
            continue;
          }
        }

        // Apply the event
        const savedEvent = await eventEngine.emitEvent({
          eventType: item.eventType as WorkflowEventType,
          entityType: item.entityType || 'SYSTEM',
          entityId: item.entityId || 'unknown',
          department: item.department || 'WARD',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: {
            ...item.metadata,
            syncedFromOffline: true,
            clientTimestamp: item.timestamp,
            clientDeviceId: item.deviceId || 'unknown',
          },
          idempotencyKey: idempotencyKey,
        });

        syncedResults.push({
          clientEventId,
          serverEventId: savedEvent.id,
          status: 'SYNCED',
        });

      } catch (err: any) {
        syncedResults.push({
          clientEventId,
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    const synced = syncedResults.filter((r) => r.status === 'SYNCED').length;
    const duplicates = syncedResults.filter((r) => r.status === 'DUPLICATE').length;
    const failed = syncedResults.filter((r) => r.status === 'FAILED' || r.status === 'REJECTED').length;

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'OFFLINE_EVENT_BATCH_SYNC',
      entityType: 'SYNC_QUEUE',
      entityId: 'offline_sync_batch',
      newState: {
        totalReceived: events.length,
        synced,
        duplicates,
        failed,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        totalReceived: events.length,
        syncedCount: synced,
        duplicateCount: duplicates,
        failedCount: failed,
        results: syncedResults,
      },
    });
  }
}

export const syncController = new SyncController();
