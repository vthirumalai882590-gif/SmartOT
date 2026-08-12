import { Response } from 'express';
import { analyticsService } from '../analytics/analytics.service';
import { whatIfSimulator } from '../analytics/simulator';
import { nextBestActionEngine } from '../analytics/next-best-action';
import { delayEngine } from '../analytics/delay-engine';
import { delayRiskEngine } from '../analytics/risk-engine';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AnalyticsController {
  public async getBottlenecks(req: AuthenticatedRequest, res: Response): Promise<void> {
    const bottlenecks = analyticsService.getBottlenecks();
    res.json({ success: true, data: bottlenecks });
  }

  public async getUtilization(req: AuthenticatedRequest, res: Response): Promise<void> {
    const utilization = analyticsService.getOTUtilization();
    res.json({ success: true, data: utilization });
  }

  public async getCSSDDemand(req: AuthenticatedRequest, res: Response): Promise<void> {
    const demand = analyticsService.getCSSDDemandForecast();
    res.json({ success: true, data: demand });
  }

  public async getNextBestActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const actions = nextBestActionEngine.generateRankedActions();
    res.json({ success: true, data: actions });
  }

  public async simulateWhatIf(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { turnoverReductionMinutes, transferOptimizationMinutes, prepChecklistAutomationHours } = req.body;

    const result = whatIfSimulator.runSimulation({
      turnoverReductionMinutes: Number(turnoverReductionMinutes) || 0,
      transferOptimizationMinutes: Number(transferOptimizationMinutes) || 0,
      prepChecklistAutomationHours: Number(prepChecklistAutomationHours) || 0,
    });

    res.json({ success: true, data: result });
  }

  public async getSurgeryRootCause(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const analysis = delayEngine.analyzeSurgeryRootCause(id);
    const risk = delayRiskEngine.assessSurgeryRisk(id);
    res.json({ success: true, data: { analysis, risk } });
  }

}

export const analyticsController = new AnalyticsController();
