import { patientRepository } from '../repositories/patient.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { Patient, PatientStatus } from '../../../shared/src/types';

export interface TransitionContext {
  actorId: string;
  actorName: string;
  department?: 'WARD' | 'OT' | 'TRANSFER' | 'ADMISSIONS' | 'ADMIN';
  surgeryId?: string;
  otId?: string;
  otCode?: string;
  reason?: string;
  ipAddress?: string;
}

export class PatientStateService {
  /**
   * Centralized domain state machine transition for Patients.
   * Enforces valid state transitions, updates storage, emits workflow events, and logs audit entries.
   */
  public async transitionPatientStatus(
    patientId: string,
    targetStatus: PatientStatus,
    context: TransitionContext
  ): Promise<{ success: boolean; patient?: Patient; error?: string }> {
    const patient = patientRepository.findById(patientId);
    if (!patient) {
      return { success: false, error: `Patient "${patientId}" not found` };
    }

    const previousStatus = patient.status;

    // Delegate validation & update to repository state machine
    const updateResult = patientRepository.updateStatus(patientId, targetStatus);
    if (!updateResult.success || !updateResult.patient) {
      return {
        success: false,
        error: updateResult.error || `Invalid patient transition from "${previousStatus}" to "${targetStatus}"`,
      };
    }

    // Determine event type based on target status
    let eventType: any = 'READINESS_UPDATED';
    if (targetStatus === 'READY_FOR_OT') eventType = 'PATIENT_READY';
    else if (targetStatus === 'IN_TRANSFER') eventType = 'TRANSFER_STARTED';
    else if (targetStatus === 'IN_OT') eventType = 'PATIENT_ARRIVED_OT';
    else if (targetStatus === 'IN_SURGERY') eventType = 'SURGERY_STARTED';
    else if (targetStatus === 'POST_OP') eventType = 'SURGERY_COMPLETED';

    // Emit workflow event
    await eventEngine.emitEvent({
      eventType,
      entityType: 'PATIENT',
      entityId: patientId,
      department: context.department || 'WARD',
      actorId: context.actorId,
      actorName: context.actorName,
      metadata: {
        patientId,
        fromStatus: previousStatus,
        toStatus: targetStatus,
        surgeryId: context.surgeryId || patient.activeSurgeryId,
        otId: context.otId,
        otCode: context.otCode,
        reason: context.reason,
      },
    });

    // Write audit log entry
    auditRepository.log({
      actorId: context.actorId,
      actorName: context.actorName,
      action: `PATIENT_TRANSITION_${targetStatus}`,
      entityType: 'PATIENT',
      entityId: patientId,
      previousState: { status: previousStatus },
      newState: { status: targetStatus, surgeryId: context.surgeryId },
      ipAddress: context.ipAddress,
    });

    return { success: true, patient: updateResult.patient };
  }
}

export const patientStateService = new PatientStateService();
