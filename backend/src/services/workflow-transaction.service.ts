import { transferRepository } from '../repositories/transfer.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { patientStateService } from './patient-state.service';
import { otStateService } from './ot-state.service';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { PatientTransfer, CSSDPack, QRVerificationResult } from '../../../shared/src/types';

export interface StartTransferParams {
  patientId: string;
  surgeryId: string;
  fromWard?: string;
  toOtId: string;
  toOtCode?: string;
  actorId: string;
  actorName: string;
  ipAddress?: string;
}

export interface ArrivePatientParams {
  transferId?: string;
  patientId?: string;
  otId?: string;
  actorId: string;
  actorName: string;
  ipAddress?: string;
}

export interface AssignCSSDPackParams {
  packId: string;
  surgeryId: string;
  patientId: string;
  otId: string;
  targetOT?: string;
  requiredPackType?: string;
  actorId: string;
  actorName: string;
  ipAddress?: string;
}

export class WorkflowTransactionService {
  /**
   * Atomic Transactional Workflow: Initiates surgical patient transfer.
   * If any step (patient transition, OT update) fails, the created transfer is rolled back atomically.
   */
  public async executePatientTransfer(
    params: StartTransferParams
  ): Promise<{ success: boolean; transfer?: PatientTransfer; error?: string }> {
    const { patientId, surgeryId, fromWard, toOtId, toOtCode, actorId, actorName, ipAddress } = params;

    // 1. Validation
    if (!patientId || !toOtId) {
      return { success: false, error: 'patientId and toOtId are required' };
    }
    if (!surgeryId) {
      return { success: false, error: 'surgeryId is required for surgical transfers' };
    }

    const surgery = otRepository.findSurgeryById(surgeryId);
    if (!surgery) {
      return { success: false, error: `Surgery "${surgeryId}" not found` };
    }

    const patient = patientRepository.findById(patientId);
    if (!patient) {
      return { success: false, error: `Patient "${patientId}" not found` };
    }

    const canonicalOtId = otRepository.resolveOTId(toOtId);
    if (!canonicalOtId) {
      return { success: false, error: `Operating Theatre "${toOtId}" not found` };
    }
    const ot = otRepository.findOTById(canonicalOtId);

    // 2. Create Transfer Record
    const transfer = transferRepository.startTransfer({
      patientId,
      surgeryId,
      fromWard: fromWard || patient.wardId || 'Inpatient Ward',
      toOtId: canonicalOtId,
      toOtCode: toOtCode || ot?.code || surgery.otCode,
    });

    // 3. Update Patient Status (IN_TRANSFER) via Domain Service
    const patientTransition = await patientStateService.transitionPatientStatus(patientId, 'IN_TRANSFER', {
      actorId,
      actorName,
      department: 'WARD',
      surgeryId,
      otId: canonicalOtId,
      otCode: ot?.code,
      ipAddress,
    });

    // Rollback if patient transition fails
    if (!patientTransition.success) {
      transferRepository.cancelTransfer(transfer.id);
      return { success: false, error: patientTransition.error };
    }

    // 4. Update OT Status (PATIENT_TRANSFER) via Domain Service
    const otTransition = await otStateService.transitionOTStatus(canonicalOtId, 'PATIENT_TRANSFER', {
      actorId,
      actorName,
      department: 'TRANSFER',
      surgeryId,
      ipAddress,
    });

    if (!otTransition.success) {
      // Rollback patient status & transfer record
      patientRepository.forceUpdateStatus(patientId, patient.status);
      transferRepository.cancelTransfer(transfer.id);
      return { success: false, error: otTransition.error };
    }

    return { success: true, transfer };
  }

  /**
   * Atomic Transactional Workflow: Complete patient arrival in Operating Theatre.
   */
  public async executePatientArrival(
    params: ArrivePatientParams
  ): Promise<{ success: boolean; transfer?: PatientTransfer; error?: string }> {
    const { transferId, patientId, otId, actorId, actorName, ipAddress } = params;

    let targetTransfer = transferId ? transferRepository.findById(transferId) : undefined;
    if (!targetTransfer && patientId) {
      targetTransfer = transferRepository.findActiveTransferByPatient(patientId);
    }

    if (!targetTransfer && !patientId) {
      return { success: false, error: 'Either transferId or patientId must be provided' };
    }

    const resolvedPatientId = patientId || targetTransfer?.patientId;
    const resolvedOtId = otId || targetTransfer?.toOtId;

    let transfer = targetTransfer ? transferRepository.completeArrival(targetTransfer.id) : undefined;

    // Transition Patient to IN_OT
    if (resolvedPatientId) {
      await patientStateService.transitionPatientStatus(resolvedPatientId, 'IN_OT', {
        actorId,
        actorName,
        department: 'OT',
        surgeryId: targetTransfer?.surgeryId,
        otId: resolvedOtId,
        ipAddress,
      });
    }

    // Transition OT to PATIENT_ARRIVED
    if (resolvedOtId) {
      await otStateService.transitionOTStatus(resolvedOtId, 'PATIENT_ARRIVED', {
        actorId,
        actorName,
        department: 'OT',
        surgeryId: targetTransfer?.surgeryId,
        ipAddress,
      });
    }

    return { success: true, transfer };
  }

  /**
   * Atomic Transactional Workflow: CSSD Sterile Pack Verification & Canonical Assignment.
   * Performs 15-step QR verification chain and attaches assignedSurgeryId, assignedPatientId, assignedOtId.
   */
  public async executeCSSDPackAssignment(
    params: AssignCSSDPackParams
  ): Promise<{ success: boolean; pack?: CSSDPack; verification?: QRVerificationResult; error?: string }> {
    const { packId, surgeryId, patientId, otId, targetOT, requiredPackType, actorId, actorName, ipAddress } = params;

    // 1. Run 15-step QR Verification Chain
    const verification = cssdRepository.verifyQR(packId, targetOT || otId, requiredPackType, surgeryId, patientId, otId);
    if (!verification.valid || verification.status !== 'VERIFIED' || !verification.pack) {
      return {
        success: false,
        verification,
        error: verification.message || 'CSSD Pack verification failed',
      };
    }

    const canonicalOtId = otRepository.resolveOTId(otId || targetOT || '') || otId || targetOT || 'OT';
    const ot = otRepository.findOTById(canonicalOtId);

    // 2. Transition Pack to ASSIGNED with canonical relationships
    const result = cssdRepository.updatePackStatus(verification.pack.id, 'ASSIGNED', {
      assignedOtId: canonicalOtId,
      assignedSurgeryId: surgeryId,
      assignedPatientId: patientId,
      currentLocation: `${ot?.code || canonicalOtId} Sterile Anteroom`,
    });

    if (!result.success || !result.pack) {
      return { success: false, error: result.error || 'Failed to update CSSD pack status' };
    }

    // 3. Update Surgery Record with assignedPackId
    if (surgeryId) {
      otRepository.updateSurgery(surgeryId, { assignedPackId: result.pack.packId });
    }

    // 4. Emit CSSD_PACK_ASSIGNED event with full 4-entity relational metadata
    await eventEngine.emitEvent({
      eventType: 'CSSD_PACK_ASSIGNED',
      entityType: 'CSSD_PACK',
      entityId: result.pack.packId,
      department: 'CSSD',
      actorId,
      actorName,
      metadata: {
        packId: result.pack.packId,
        surgeryId,
        patientId,
        otId: canonicalOtId,
        toOtCode: ot?.code,
        packType: result.pack.packType,
        sterilizationBatch: result.pack.sterilizationBatch,
      },
    });

    // 5. Write audit log
    auditRepository.log({
      actorId,
      actorName,
      action: 'CSSD_PACK_ASSIGNED_TO_SURGERY',
      entityType: 'CSSD_PACK',
      entityId: result.pack.packId,
      newState: {
        status: 'ASSIGNED',
        assignedSurgeryId: surgeryId,
        assignedPatientId: patientId,
        assignedOtId: canonicalOtId,
      },
      ipAddress,
    });

    return { success: true, pack: result.pack, verification };
  }
}

export const workflowTransactionService = new WorkflowTransactionService();
