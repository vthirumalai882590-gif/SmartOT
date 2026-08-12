import { Response } from 'express';
import { auditRepository } from '../repositories/audit.repository';
import { eventRepository } from '../repositories/event.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuditController {
  public async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const logs = auditRepository.findAll();
    res.json({ success: true, data: logs });
  }

  public async getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const events = eventRepository.findAll();
    res.json({ success: true, data: events });
  }
}

export const auditController = new AuditController();
