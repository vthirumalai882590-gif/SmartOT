import { eventRepository } from '../repositories/event.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { transferRepository } from '../repositories/transfer.repository';
import { WorkflowEvent } from '../../../shared/src/types';

export interface CorrelatedCaseTimeline {
  surgeryId: string;
  patientId: string;
  patientName?: string;
  otCode?: string;
  procedureName?: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  stages: {
    admission?: { timestamp: string; actor: string };
    readiness?: { timestamp: string; isReady: boolean; consent: string };
    cssdVerification?: { timestamp: string; packId: string; packType: string; status: string };
    transfer?: { startedAt: string; arrivedAt?: string; durationMinutes?: number; transferId?: string };
    otArrival?: { timestamp: string };
    surgeryStart?: { timestamp: string; delayMinutes: number };
    surgeryCompletion?: { timestamp: string; durationMinutes: number };
    turnover?: { startedAt: string; completedAt?: string; durationMinutes?: number };
  };
  events: WorkflowEvent[];
  uncorrelatedEvents: WorkflowEvent[];  // FIX: track events that couldn't be confidently linked
}

export class CorrelationEngine {
  public correlateSurgeryTimeline(surgeryId: string): CorrelatedCaseTimeline | null {
    const surgery = otRepository.findSurgeryById(surgeryId);
    if (!surgery) return null;

    const patient = patientRepository.findById(surgery.patientId);
    const ot = otRepository.findOTById(surgery.otId);

    // FIX: Use explicit surgeryId-based event lookup (via metadata.surgeryId) as primary strategy.
    // Fall back to patient-based lookup only as secondary strategy.
    // This prevents cross-surgery event contamination.
    const surgeryEvents = eventRepository.findBySurgeryId(surgeryId);

    // Secondary: patient-level events (admission, readiness) where surgery wasn't known yet
    const patientOnlyEvents = eventRepository
      .findAll()
      .filter(
        (e) =>
          (e.entityId === surgery.patientId || e.metadata?.patientId === surgery.patientId) &&
          // Exclude events already captured by surgeryId search
          !surgeryEvents.find((se) => se.id === e.id)
      );

    // CSSD pack events — look for events referencing assigned pack
    const packEvents = surgery.assignedPackId
      ? eventRepository.findAll().filter(
          (e) =>
            (e.entityId === surgery.assignedPackId || e.metadata?.packId === surgery.assignedPackId) &&
            !surgeryEvents.find((se) => se.id === e.id)
        )
      : [];

    // Combine all related events
    const allRelatedEvents = [...new Map(
      [...surgeryEvents, ...patientOnlyEvents, ...packEvents].map((e) => [e.id, e])
    ).values()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Identify uncorrelated events (those that came in via patient fallback only, not surgeryId)
    const uncorrelatedEvents: WorkflowEvent[] = patientOnlyEvents.filter((e) => {
      // Mark as uncorrelated if event type is surgery/transfer/CSSD related but has no surgeryId
      const surgerySensitiveTypes = [
        'TRANSFER_STARTED', 'PATIENT_ARRIVED_OT', 'CSSD_PACK_SCANNED',
        'CSSD_PACK_ASSIGNED', 'SURGERY_STARTED', 'SURGERY_COMPLETED',
      ];
      return (
        surgerySensitiveTypes.includes(e.eventType) &&
        !e.metadata?.surgeryId &&
        e.entityId !== surgeryId
      );
    });

    const timeline: CorrelatedCaseTimeline = {
      surgeryId,
      patientId: surgery.patientId,
      patientName: patient?.name,
      otCode: ot?.code,
      procedureName: surgery.procedureName,
      scheduledStartTime: surgery.scheduledStartTime,
      actualStartTime: surgery.actualStartTime,
      stages: {},
      events: allRelatedEvents,
      uncorrelatedEvents,
    };

    // --- Stage Correlation ---

    // Admission: patient-level event
    const admitEvt = allRelatedEvents.find((e) => e.eventType === 'PATIENT_ADMITTED');
    if (admitEvt) {
      timeline.stages.admission = { timestamp: admitEvt.timestamp, actor: admitEvt.actorName };
    }

    // Readiness & Consent: from patient record (database source of truth, not event)
    if (patient?.readiness) {
      timeline.stages.readiness = {
        timestamp: patient.readiness.updatedAt,
        isReady: patient.readiness.isReady,
        consent: patient.readiness.consentStatus,
      };
    }

    // CSSD Pack: prefer events with explicit surgeryId match; fall back to pack assignment
    const cssdEvt = allRelatedEvents.find(
      (e) =>
        (e.eventType === 'CSSD_PACK_SCANNED' || e.eventType === 'CSSD_PACK_ASSIGNED') &&
        (e.metadata?.surgeryId === surgeryId || e.metadata?.assignedSurgeryId === surgeryId ||
         e.entityId === surgery.assignedPackId)
    );
    if (cssdEvt) {
      timeline.stages.cssdVerification = {
        timestamp: cssdEvt.timestamp,
        packId: cssdEvt.entityId,
        packType: cssdEvt.metadata?.packType || surgery.requiredPackType,
        status: cssdEvt.metadata?.verificationResult || 'VERIFIED',
      };
    }

    // Transfer: use explicit surgeryId match first (transfer.surgeryId field)
    // FIX: transferRepository.findAll() now has transfers with real surgeryId (no 'surg_default')
    const transfer = transferRepository
      .findAll()
      .find(
        (t) =>
          t.surgeryId === surgeryId ||
          (t.patientId === surgery.patientId && t.surgeryId && t.surgeryId !== 'surg_default')
      );
    if (transfer) {
      timeline.stages.transfer = {
        startedAt: transfer.transferStartedAt,
        arrivedAt: transfer.patientArrivedAt,
        durationMinutes: transfer.durationMinutes,
        transferId: transfer.id,
      };
    }

    // Surgery Execution
    const startEvt = allRelatedEvents.find((e) => e.eventType === 'SURGERY_STARTED');
    if (startEvt) {
      timeline.stages.surgeryStart = {
        timestamp: startEvt.timestamp,
        delayMinutes: surgery.delayMinutes || 0,
      };
    }

    const endEvt = allRelatedEvents.find((e) => e.eventType === 'SURGERY_COMPLETED');
    if (endEvt && startEvt) {
      const dur = Math.round(
        (new Date(endEvt.timestamp).getTime() - new Date(startEvt.timestamp).getTime()) / (1000 * 60)
      );
      timeline.stages.surgeryCompletion = {
        timestamp: endEvt.timestamp,
        durationMinutes: dur,
      };
    }

    return timeline;
  }
}

export const correlationEngine = new CorrelationEngine();
