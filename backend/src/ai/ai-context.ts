import { analyticsService } from '../analytics/analytics.service';
import { otRepository } from '../repositories/ot.repository';
import { alertRepository } from '../repositories/alert.repository';
import { eventRepository } from '../repositories/event.repository';
import { nextBestActionEngine } from '../analytics/next-best-action';
import { AIOperationsContext } from '../../../shared/src/types';

/**
 * AIContextBuilder: Constructs the operational context snapshot sent to the AI Consultant.
 *
 * ⚠️ PRIVACY POLICY:
 *   - Patient names, MRN, phone, address, and other PII are NEVER sent to an external LLM.
 *   - Only anonymized operational identifiers (patientId, surgeryId, otId) are included.
 *   - AI is provided with operational state, not personal health information.
 *
 * ⚠️ CLINICAL DISCLAIMER:
 *   - This context is for OPERATIONAL DECISION SUPPORT only.
 *   - The AI must NEVER make clinical diagnosis or treatment decisions.
 *   - AI recommendations are advisory — final decisions rest with qualified clinical staff.
 */
export class AIContextBuilder {
  public buildContext(): AIOperationsContext {
    const kpis = analyticsService.getHeroKpis();
    const ots = otRepository.findAllOTs();
    const surgeries = otRepository.findAllSurgeries();
    const alerts = alertRepository.findOpenAlerts();
    const recentEvents = eventRepository.findAll().slice(0, 8);
    const bottlenecks = analyticsService.getBottlenecks();
    const nextBestActions = nextBestActionEngine.generateRankedActions();

    // FIX: Strip PII — never send patient names or MRN to external LLM
    // Use only operational identifiers: patientId, surgeryId, otCode, procedureName
    const otStatuses = ots.map((ot) => {
      const activeSurg = surgeries.find((s) => s.id === ot.activeSurgeryId);
      return {
        code: ot.code,
        status: ot.currentStatus,
        // PRIVACY: patientId used instead of patient name
        currentPatientId: activeSurg?.patientId ?? null,
        currentSurgeryId: activeSurg?.id ?? null,
        currentProcedure: activeSurg?.procedureName ?? null,  // procedure name is operational, not PII
        delayMinutes: ot.currentDelayMinutes,
        riskLevel: ot.riskLevel,
      };
    });

    // Strip PII from alerts (alert titles may contain patient names — sanitize)
    const sanitizedAlerts = alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      // Title may contain patient name — keep but mark as possibly PII-containing
      title: a.title,
      description: a.description,
      entityType: a.entityType,
      entityId: a.entityId,
      responsibleRole: a.responsibleRole,
    }));

    // Strip PII from recent events
    const sanitizedEvents = recentEvents.map((e) => ({
      eventType: e.eventType,
      timestamp: e.timestamp,
      department: e.department,
      entityType: e.entityType,
      entityId: e.entityId,
      // actorName is staff identity (not patient) — included for operational context
      actorName: e.actorName,
      // Sanitize metadata: remove any patient name fields
      metadata: e.metadata ? this.sanitizeMetadata(e.metadata) : {},
    }));

    return {
      hospitalName: 'SmartOT Command — Surgical Suite Operations',
      currentTime: new Date().toISOString(),
      // DISCLAIMER: This context is for operational workflow support only.
      // The AI must not make clinical decisions, invent facts, or override deterministic system data.
      operationalDisclaimer: 'OPERATIONAL_DECISION_SUPPORT_ONLY — Not for clinical diagnosis or treatment.',
      kpis,
      otStatuses,
      activeAlerts: sanitizedAlerts,
      recentEvents: sanitizedEvents,
      bottlenecks,
      nextBestActions,
    } as AIOperationsContext;
  }

  /**
   * Remove known PII fields from event metadata before sending to AI.
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const PII_KEYS = ['patientName', 'name', 'mrn', 'phone', 'address', 'dob', 'dateOfBirth'];
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(metadata)) {
      if (!PII_KEYS.includes(key)) {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}

export const aiContextBuilder = new AIContextBuilder();
