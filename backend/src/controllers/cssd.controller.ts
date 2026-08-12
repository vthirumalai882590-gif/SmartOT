import { Response } from 'express';
import { cssdRepository } from '../repositories/cssd.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CSSDPackStatus } from '../../../shared/src/types';

export class CSSDController {
  public async getPacks(req: AuthenticatedRequest, res: Response): Promise<void> {
    const packs = cssdRepository.findAllPacks();
    res.json({ success: true, data: packs });
  }

  public async scanAndVerifyQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { packId, targetOT, requiredPackType } = req.body;
    const actor = req.user || { userId: 'system', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF', department: 'CSSD' };

    if (!packId) {
      res.status(400).json({ success: false, error: 'PACK_ID_REQUIRED', message: 'packId is required for QR scan' });
      return;
    }

    const verification = cssdRepository.verifyQR(packId, targetOT, requiredPackType);

    // Emit scan event
    await eventEngine.emitEvent({
      eventType: verification.status === 'VERIFIED' ? 'CSSD_PACK_SCANNED' : 'CSSD_PACK_BLOCKED',
      entityType: 'CSSD_PACK',
      entityId: packId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        verificationResult: verification.status,
        reasons: verification.reasons,
        targetOT,
        requiredPackType,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'CSSD_PACK_QR_SCAN',
      entityType: 'CSSD_PACK',
      entityId: packId,
      newState: { status: verification.status, reasons: verification.reasons },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: verification });
  }

  public async transitionPackStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { targetStatus, assignedOtId, assignedSurgeryId, currentLocation } = req.body;
    const actor = req.user || { userId: 'system', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF', department: 'CSSD' };


    const pack = cssdRepository.findPackById(id);
    if (!pack) {
      res.status(404).json({ success: false, error: 'PACK_NOT_FOUND' });
      return;
    }

    const prevStatus = pack.currentStatus;
    const result = cssdRepository.updatePackStatus(id, targetStatus as CSSDPackStatus, {
      assignedOtId,
      assignedSurgeryId,
      currentLocation,
    });

    if (!result.success || !result.pack) {
      res.status(400).json({ success: false, error: 'INVALID_TRANSITION', message: result.error });
      return;
    }

    // Determine event type
    let eventType: any = 'CSSD_PACK_STORED';
    if (targetStatus === 'ASSIGNED') eventType = 'CSSD_PACK_ASSIGNED';
    else if (targetStatus === 'STERILIZING') eventType = 'CSSD_PACK_STERILIZING';
    else if (targetStatus === 'STERILIZED') eventType = 'CSSD_PACK_STERILIZED';
    else if (targetStatus === 'AVAILABLE') eventType = 'CSSD_PACK_AVAILABLE';
    else if (targetStatus === 'IN_USE') eventType = 'CSSD_PACK_IN_USE';
    else if (targetStatus === 'RETURNED') eventType = 'CSSD_PACK_RETURNED';
    else if (targetStatus === 'REPROCESSING') eventType = 'CSSD_PACK_REPROCESSING';

    await eventEngine.emitEvent({
      eventType,
      entityType: 'CSSD_PACK',
      entityId: result.pack.packId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: { fromStatus: prevStatus, toStatus: targetStatus, assignedOtId, assignedSurgeryId },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'CSSD_PACK_LIFECYCLE_TRANSITION',
      entityType: 'CSSD_PACK',
      entityId: result.pack.packId,
      previousState: { status: prevStatus },
      newState: { status: targetStatus, assignedOtId, assignedSurgeryId },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result.pack });
  }
}

export const cssdController = new CSSDController();
