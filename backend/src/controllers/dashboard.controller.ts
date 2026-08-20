import { Request, Response } from 'express';
import { analyticsService } from '../analytics/analytics.service';
import { otRepository } from '../repositories/ot.repository';
import { alertRepository } from '../repositories/alert.repository';
import { eventRepository } from '../repositories/event.repository';
import { nextBestActionEngine } from '../analytics/next-best-action';

export class DashboardController {
  public async getCommandCenter(req: Request, res: Response): Promise<void> {
    // FIX: Dashboard is READ-ONLY. Alert evaluation is NOT triggered on every dashboard fetch.
    // Alert rules are evaluated by the AlertEngine when workflow events occur, and by
    // the scheduled periodic evaluation triggered at startup — not on browser refresh.
    // This prevents duplicate alerts created by repeated GET requests.

    const kpis = analyticsService.getHeroKpis();
    const ots = otRepository.findAllOTs();
    const surgeries = otRepository.findAllSurgeries();
    const alerts = alertRepository.findOpenAlerts();
    const bottlenecks = analyticsService.getBottlenecks();
    const nextBestActions = nextBestActionEngine.generateRankedActions();
    const recentEvents = eventRepository.findAll().slice(0, 10);

    const enrichedOTs = ots.map((ot) => {
      const activeSurgery = surgeries.find((s) => s.id === ot.activeSurgeryId);
      return {
        ...ot,
        activeSurgery,
      };
    });

    // Enrich surgeries with root-cause risk data
    const enrichedSurgeries = surgeries.map((s) => {
      return {
        ...s,
        riskScore: (s as any).riskScore ?? 0,
        riskLevel: s.riskLevel ?? 'LOW',
        riskReasons: s.riskReasons ?? [],
        downstreamImpacts: (s as any).downstreamImpacts ?? [],
      };
    });

    res.json({
      success: true,
      data: {
        kpis,
        operatingTheatres: enrichedOTs,
        scheduledSurgeries: enrichedSurgeries,
        patients: [],  // lightweight — use /api/patients for full patient list
        activeAlerts: alerts,
        alerts,
        bottlenecks,
        nextBestActions,
        recentEvents,
      },
    });
  }
}

export const dashboardController = new DashboardController();
