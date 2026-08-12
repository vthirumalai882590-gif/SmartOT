import { analyticsService } from '../analytics/analytics.service';
import { otRepository } from '../repositories/ot.repository';
import { alertRepository } from '../repositories/alert.repository';
import { eventRepository } from '../repositories/event.repository';
import { nextBestActionEngine } from '../analytics/next-best-action';
import { AIOperationsContext } from '../../../shared/src/types';

export class AIContextBuilder {
  public buildContext(): AIOperationsContext {
    const kpis = analyticsService.getHeroKpis();
    const ots = otRepository.findAllOTs();
    const surgeries = otRepository.findAllSurgeries();
    const alerts = alertRepository.findOpenAlerts();
    const recentEvents = eventRepository.findAll().slice(0, 8);
    const bottlenecks = analyticsService.getBottlenecks();
    const nextBestActions = nextBestActionEngine.generateRankedActions();

    const otStatuses = ots.map((ot) => {
      const activeSurg = surgeries.find((s) => s.id === ot.activeSurgeryId);
      return {
        code: ot.code,
        status: ot.currentStatus,
        currentPatient: activeSurg?.patientName,
        currentProcedure: activeSurg?.procedureName,
        delayMinutes: ot.currentDelayMinutes,
        riskLevel: ot.riskLevel,
      };
    });

    return {
      hospitalName: 'St. Jude Memorial Hospital — Surgical Suite Operations',
      currentTime: new Date().toISOString(),
      kpis,
      otStatuses,
      activeAlerts: alerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        description: a.description,
        responsibleRole: a.responsibleRole,
      })),
      recentEvents: recentEvents.map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        summary: `[${e.department}] ${e.eventType} on ${e.entityId} by ${e.actorName}`,
      })),
      bottlenecks,
      nextBestActions,
    };
  }
}

export const aiContextBuilder = new AIContextBuilder();
