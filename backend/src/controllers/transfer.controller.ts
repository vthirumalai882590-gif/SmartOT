import { Response } from 'express';
import { transferRepository } from '../repositories/transfer.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TransferController {
  public async getTransfers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transfers = transferRepository.findAll();
    res.json({ success: true, data: transfers });
  }

  public async startTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { patientId, surgeryId, fromWard, toOtId, toOtCode } = req.body;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };

    if (!patientId || !toOtId) {
      res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'patientId and toOtId are required' });
      return;
    }

    const transfer = transferRepository.startTransfer({
      patientId,
      surgeryId: surgeryId || 'surg_default',
      fromWard: fromWard || 'Inpatient Ward',
      toOtId,
      toOtCode,
    });

    patientRepository.updateStatus(patientId, 'IN_TRANSFER');
    otRepository.updateOTStatus(toOtId, 'PATIENT_TRANSFER');

    await eventEngine.emitEvent({
      eventType: 'TRANSFER_STARTED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      department: 'WARD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: { patientId, toOtCode, fromWard },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'PATIENT_TRANSFER_STARTED',
      entityType: 'PATIENT',
      entityId: patientId,
      newState: { transferId: transfer.id, toOtCode },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: transfer });
  }

  public async arrivePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { transferId, patientId, otId } = req.body;
    const actor = req.user || { userId: 'system', email: 'otmanager@smartot.hospital', role: 'OT_MANAGER', department: 'OT' };

    let targetTransfer = transferId ? transferRepository.findById(transferId) : undefined;
    if (!targetTransfer && patientId) {
      targetTransfer = transferRepository.findActiveTransferByPatient(patientId);
    }

    let transfer = targetTransfer ? transferRepository.completeArrival(targetTransfer.id) : undefined;

    if (patientId) {
      patientRepository.updateStatus(patientId, 'IN_OT');
    }
    if (otId) {
      otRepository.updateOTStatus(otId, 'PATIENT_ARRIVED');
    }

    await eventEngine.emitEvent({
      eventType: 'PATIENT_ARRIVED_OT',
      entityType: 'TRANSFER',
      entityId: transfer?.id || `trf_${patientId}`,
      department: 'OT',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        patientId,
        otId,
        transferDurationMinutes: transfer?.durationMinutes,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'PATIENT_ARRIVED_OT',
      entityType: 'PATIENT',
      entityId: patientId || transfer?.patientId || 'patient',
      newState: { status: 'IN_OT', durationMinutes: transfer?.durationMinutes },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { transfer, message: 'Patient arrival recorded in Operating Theatre' } });
  }
}

export const transferController = new TransferController();
