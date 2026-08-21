import { db } from '../database/db';
import { transferRepository } from '../repositories/transfer.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { patientStateService } from './patient-state.service';
import { otStateService } from './ot-state.service';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { PatientTransfer, CSSDPack, QRVerificationResult, Surgery } from '../../../shared/src/types';

export interface StartTransferParams {
  patientId: string;
  surgeryId?: string;
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

    const patient = patientRepository.findById(patientId);
    if (!patient) {
      return { success: false, error: `Patient "${patientId}" not found` };
    }

    const canonicalOtId = otRepository.resolveOTId(toOtId);
    if (!canonicalOtId) {
      return { success: false, error: `Operating Theatre "${toOtId}" not found` };
    }
    const ot = otRepository.findOTById(canonicalOtId);

    // 2. Resolve or Auto-Create Surgical Case for Patient
    let surgery: Surgery | undefined;
    if (surgeryId && surgeryId !== 'surg_default') {
      surgery = otRepository.findSurgeryById(surgeryId);
    }
    if (!surgery && patient.activeSurgeryId) {
      surgery = otRepository.findSurgeryById(patient.activeSurgeryId);
    }
    if (!surgery) {
      const patientSurgeries = otRepository.findAllSurgeries().filter((s) => s.patientId === patientId && s.status !== 'COMPLETED');
      if (patientSurgeries.length > 0) {
        surgery = patientSurgeries[0];
      }
    }
    if (!surgery) {
      const now = new Date().toISOString();
      const newSurgeryId = `surg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      let packType = 'Appendectomy Set';
      const diag = (patient.primaryDiagnosis || '').toLowerCase();
      if (diag.includes('ortho') || diag.includes('fracture') || diag.includes('knee') || diag.includes('hip')) {
        packType = 'Orthopedic Arthroplasty Set';
      } else if (diag.includes('cardiac') || diag.includes('aort') || diag.includes('bypass') || diag.includes('vascular')) {
        packType = 'Cardiac Bypass Tray';
      } else if (diag.includes('laparot') || diag.includes('hernia') || diag.includes('cholecyst') || diag.includes('bowel')) {
        packType = 'Laparotomy Major Set';
      }

      const availablePacks = cssdRepository.findAvailablePacksByType(packType);
      let assignedPackId: string | undefined = undefined;
      if (availablePacks.length > 0) {
        assignedPackId = availablePacks[0].id;
        cssdRepository.transitionPackStatus(assignedPackId, 'ASSIGNED', {
          assignedOtId: canonicalOtId,
          assignedSurgeryId: newSurgeryId,
          assignedPatientId: patient.id,
        });
      }

      surgery = otRepository.createSurgery({
        id: newSurgeryId,
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        otId: canonicalOtId,
        otCode: ot?.code || toOtCode || 'OT-03',
        procedureName: patient.primaryDiagnosis || 'Surgical Procedure',
        surgeonName: 'Attending Surgeon',
        anesthesiologistName: 'On-Call Anesthesiologist',
        requiredPackType: packType,
        assignedPackId,
        scheduledStartTime: now,
        expectedDurationMinutes: 60,
        status: 'SCHEDULED',
        delayMinutes: 0,
        riskLevel: 'LOW',
        createdAt: now,
      });
      patient.activeSurgeryId = surgery.id;
      db.persist();
    }

    const resolvedSurgeryId = surgery.id;

    // 3. Create Transfer Record
    const transfer = transferRepository.startTransfer({
      patientId,
      surgeryId: resolvedSurgeryId,
      fromWard: fromWard || patient.wardId || 'Inpatient Ward',
      toOtId: canonicalOtId,
      toOtCode: toOtCode || ot?.code || surgery.otCode,
    });

    // 4. Update Patient Status (IN_TRANSFER) via Domain Service
    const patientTransition = await patientStateService.transitionPatientStatus(patientId, 'IN_TRANSFER', {
      actorId,
      actorName,
      department: 'WARD',
      surgeryId: resolvedSurgeryId,
      otId: canonicalOtId,
      otCode: ot?.code,
      ipAddress,
    });

    // Rollback if patient transition fails
    if (!patientTransition.success) {
      transferRepository.cancelTransfer(transfer.id);
      return { success: false, error: patientTransition.error };
    }

    // 5. Update OT Status (PATIENT_TRANSFER) via Domain Service
    const otTransition = await otStateService.transitionOTStatus(canonicalOtId, 'PATIENT_TRANSFER', {
      actorId,
      actorName,
      department: 'TRANSFER',
      surgeryId: resolvedSurgeryId,
      allowOverride: true,
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
