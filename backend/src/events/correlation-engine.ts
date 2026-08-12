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
    transfer?: { startedAt: string; arrivedAt?: string; durationMinutes?: number };
    otArrival?: { timestamp: string };
    surgeryStart?: { timestamp: string; delayMinutes: number };
    surgeryCompletion?: { timestamp: string; durationMinutes: number };
    turnover?: { startedAt: string; completedAt?: string; durationMinutes?: number };
  };
  events: WorkflowEvent[];
}

export class CorrelationEngine {
  public correlateSurgeryTimeline(surgeryId: string): CorrelatedCaseTimeline | null {
    const surgery = otRepository.findSurgeryById(surgeryId);
    if (!surgery) return null;

    const patient = patientRepository.findById(surgery.patientId);
    const ot = otRepository.findOTById(surgery.otId);
    const relatedEvents = eventRepository
      .findAll()
      .filter(
        (e) =>
          e.entityId === surgeryId ||
          e.entityId === surgery.patientId ||
          e.entityId === surgery.assignedPackId ||
          (e.metadata && (e.metadata.surgeryId === surgeryId || e.metadata.patientId === surgery.patientId))
      );

    const timeline: CorrelatedCaseTimeline = {
      surgeryId,
      patientId: surgery.patientId,
      patientName: patient?.name,
      otCode: ot?.code,
      procedureName: surgery.procedureName,
      scheduledStartTime: surgery.scheduledStartTime,
      actualStartTime: surgery.actualStartTime,
      stages: {},
      events: relatedEvents,
    };

    // Correlate Admission
    const admitEvt = relatedEvents.find((e) => e.eventType === 'PATIENT_ADMITTED');
    if (admitEvt) {
      timeline.stages.admission = { timestamp: admitEvt.timestamp, actor: admitEvt.actorName };
    }

    // Correlate Readiness & Consent
    if (patient?.readiness) {
      timeline.stages.readiness = {
        timestamp: patient.readiness.updatedAt,
        isReady: patient.readiness.isReady,
        consent: patient.readiness.consentStatus,
      };
    }

    // Correlate CSSD Pack
    const cssdEvt = relatedEvents.find(
      (e) => e.eventType === 'CSSD_PACK_SCANNED' || e.eventType === 'CSSD_PACK_ASSIGNED'
    );
    if (cssdEvt) {
      timeline.stages.cssdVerification = {
        timestamp: cssdEvt.timestamp,
        packId: cssdEvt.entityId,
        packType: cssdEvt.metadata?.packType || surgery.requiredPackType,
        status: cssdEvt.metadata?.verificationResult || 'VERIFIED',
      };
    }

    // Correlate Transfer
    const transfer = transferRepository.findAll().find((t) => t.surgeryId === surgeryId || t.patientId === surgery.patientId);
    if (transfer) {
      timeline.stages.transfer = {
        startedAt: transfer.transferStartedAt,
        arrivedAt: transfer.patientArrivedAt,
        durationMinutes: transfer.durationMinutes,
      };
    }

    // Correlate Surgery execution
    const startEvt = relatedEvents.find((e) => e.eventType === 'SURGERY_STARTED');
    if (startEvt) {
      timeline.stages.surgeryStart = {
        timestamp: startEvt.timestamp,
        delayMinutes: surgery.delayMinutes || 0,
      };
    }

    const endEvt = relatedEvents.find((e) => e.eventType === 'SURGERY_COMPLETED');
    if (endEvt && startEvt) {
      const dur = Math.round((new Date(endEvt.timestamp).getTime() - new Date(startEvt.timestamp).getTime()) / (1000 * 60));
      timeline.stages.surgeryCompletion = {
        timestamp: endEvt.timestamp,
        durationMinutes: dur,
      };
    }

    return timeline;
  }
}

export const correlationEngine = new CorrelationEngine();
