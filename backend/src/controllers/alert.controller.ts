import { Response } from 'express';
import { alertRepository } from '../repositories/alert.repository';
import { auditRepository } from '../repositories/audit.repository';
import { eventEngine } from '../events/event-engine';
import { alertEngine } from '../alerts/alert-engine';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AlertStatus } from '../../../shared/src/types';

export class AlertController {
  public async getAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    await alertEngine.evaluateAllRules();
    const alerts = alertRepository.findAll();
    res.json({ success: true, data: alerts });
  }

  public async updateAlertStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { status } = req.body;
    const actor = req.user || { userId: 'system', email: 'admin@smartot.hospital', role: 'ADMINISTRATOR', department: 'Admin' };


    if (!status || !['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
      res.status(400).json({ success: false, error: 'INVALID_STATUS', message: 'status must be OPEN, ACKNOWLEDGED, or RESOLVED' });
      return;
    }

    const updated = alertRepository.updateStatus(id, status as AlertStatus, actor.email);
    if (!updated) {
      res.status(404).json({ success: false, error: 'ALERT_NOT_FOUND' });
      return;
    }

    if (status === 'RESOLVED') {
      await eventEngine.emitEvent({
        eventType: 'ALERT_RESOLVED',
        entityType: 'ALERT',
        entityId: id,
        department: 'ADMIN',
        actorId: actor.userId,
        actorName: actor.email,
        metadata: { title: updated.title },
      });
    }

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'UPDATE_ALERT_STATUS',
      entityType: 'ALERT',
      entityId: id,
      newState: { status },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  }
}

export const alertController = new AlertController();
