import { Request, Response } from 'express';
import { analyticsService } from '../analytics/analytics.service';
import { otRepository } from '../repositories/ot.repository';
import { alertRepository } from '../repositories/alert.repository';
import { eventRepository } from '../repositories/event.repository';
import { nextBestActionEngine } from '../analytics/next-best-action';
import { alertEngine } from '../alerts/alert-engine';

export class DashboardController {
  public async getCommandCenter(req: Request, res: Response): Promise<void> {
    // Re-evaluate alert rules on refresh
    await alertEngine.evaluateAllRules();

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

    res.json({
      success: true,
      data: {
        kpis,
        operatingTheatres: enrichedOTs,
        alerts,
        bottlenecks,
        nextBestActions,
        recentEvents,
      },
    });
  }
}

export const dashboardController = new DashboardController();
