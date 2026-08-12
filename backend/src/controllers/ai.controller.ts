import { Response } from 'express';
import { aiContextBuilder } from '../ai/ai-context';
import { aiOperationsService } from '../ai/ai-provider';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AIController {
  public async askConsultant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { query } = req.body;
    const actor = req.user || { userId: 'usr_guest', email: 'staff@smartot.hospital', role: 'ADMINISTRATOR', department: 'Operations' };

    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'QUERY_REQUIRED', message: 'query string is required' });
      return;
    }

    const context = aiContextBuilder.buildContext();
    const consultation = await aiOperationsService.ask(query, context);

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'AI_CONSULTATION_REQUEST',
      entityType: 'AI_CONSULTANT',
      entityId: 'ai_ops',
      newState: { query, summary: consultation.summary },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        query,
        consultation,
        contextSnapshot: {
          activeSurgeries: context.kpis.activeSurgeries,
          delayedCases: context.kpis.delayedCases,
          otUtilization: context.kpis.otUtilization,
        },
      },
    });
  }

  public async getContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    const context = aiContextBuilder.buildContext();
    res.json({ success: true, data: context });
  }
}

export const aiController = new AIController();
