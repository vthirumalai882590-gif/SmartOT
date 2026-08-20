import { Response } from 'express';
import { transferRepository } from '../repositories/transfer.repository';
import { workflowTransactionService } from '../services/workflow-transaction.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TransferController {
  public async getTransfers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const transfers = transferRepository.findAll();
    res.json({ success: true, data: transfers });
  }

  public async startTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { patientId, surgeryId, fromWard, toOtId, toOtCode } = req.body;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };

    const result = await workflowTransactionService.executePatientTransfer({
      patientId,
      surgeryId,
      fromWard,
      toOtId,
      toOtCode,
      actorId: actor.userId,
      actorName: actor.email,
      ipAddress: req.ip,
    });

    if (!result.success || !result.transfer) {
      res.status(400).json({
        success: false,
        error: 'TRANSFER_FAILED',
        message: result.error || 'Failed to start patient transfer',
      });
      return;
    }

    res.json({ success: true, data: result.transfer });
  }

  public async arrivePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { transferId, patientId, otId } = req.body;
    const actor = req.user || { userId: 'system', email: 'otmanager@smartot.hospital', role: 'OT_MANAGER', department: 'OT' };

    const result = await workflowTransactionService.executePatientArrival({
      transferId,
      patientId,
      otId,
      actorId: actor.userId,
      actorName: actor.email,
      ipAddress: req.ip,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'ARRIVAL_FAILED',
        message: result.error || 'Failed to record patient arrival in Operating Theatre',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        transfer: result.transfer,
        message: 'Patient arrival recorded in Operating Theatre',
      },
    });
  }
}

export const transferController = new TransferController();
