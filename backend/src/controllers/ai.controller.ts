import { Response } from 'express';
import { aiContextBuilder } from '../ai/ai-context';
import { aiOperationsService } from '../ai/ai-provider';
import { auditRepository } from '../repositories/audit.repository';
import { analyticsService } from '../analytics/analytics.service';
import { otRepository } from '../repositories/ot.repository';
import { alertRepository } from '../repositories/alert.repository';
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

    // FIX: AI failure isolation — core operations must continue even when AI is unavailable
    let consultation: any;
    let aiAvailable = true;

    try {
      consultation = await aiOperationsService.ask(query, context, actor.userId);
    } catch (err: any) {
      aiAvailable = false;
      console.warn('[AI Consultant] External AI provider unavailable:', err.message);

      // Graceful degradation: return deterministic operational summary without AI
      const kpis = analyticsService.getHeroKpis();
      const alerts = alertRepository.findOpenAlerts();
      consultation = {
        summary: `AI Consultant is temporarily unavailable. Current operational status: ` +
                 `${kpis.activeSurgeries} active surgeries, ${kpis.delayedCases} delayed cases, ` +
                 `${alerts.length} open alerts. Please review the Dashboard for real-time data.`,
        likelyCauses: [],
        evidence: [],
        recommendedActions: [
          'AI service is temporarily unreachable. Core SmartOT operations are unaffected.',
          'Review active alerts in the Dashboard for immediate action items.',
          'Check Analytics page for bottleneck and utilization data.',
        ],
        uncertainty: 'AI provider unavailable — this is a deterministic operational summary only.',
        confidence: 0,
        provider: 'FALLBACK_DETERMINISTIC',
        model: 'none',
      };
    }

    try {
      auditRepository.log({
        actorId: actor.userId,
        actorName: actor.email,
        action: 'AI_CONSULTATION_REQUEST',
        entityType: 'AI_CONSULTANT',
        entityId: 'ai_ops',
        newState: {
          query: query.substring(0, 200),  // truncate long queries in audit
          summary: consultation.summary?.substring(0, 500),
          aiAvailable,
        },
        ipAddress: req.ip,
      });
    } catch (auditErr) {
      console.error('[Audit] Failed to log AI consultation:', auditErr);
    }

    res.json({
      success: true,
      data: {
        query,
        consultation,
        aiAvailable,
        contextSnapshot: {
          activeSurgeries: context.kpis.activeSurgeries,
          delayedCases: context.kpis.delayedCases,
          otUtilization: context.kpis.otUtilization,
        },
      },
    });
  }

  public async getContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const context = aiContextBuilder.buildContext();
      res.json({ success: true, data: context });
    } catch (err: any) {
      // Context building should not fail, but guard defensively
      res.status(500).json({ success: false, error: 'CONTEXT_BUILD_ERROR', message: err.message });
    }
  }

  public async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { aiInteractionRepository } = await import('../repositories/ai-interaction.repository');
      const history = await aiInteractionRepository.findAll();
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.json({ success: true, data: [] });
    }
  }
}

export const aiController = new AIController();
