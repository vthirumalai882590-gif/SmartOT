import { alertRepository } from '../repositories/alert.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { eventEngine } from '../events/event-engine';
import { Alert, WorkflowEvent } from '../../../shared/src/types';
import { OPERATIONAL_BENCHMARKS } from '../../../shared/src/constants';

export class AlertEngine {
  private static instance: AlertEngine;

  public static getInstance(): AlertEngine {
    if (!AlertEngine.instance) {
      AlertEngine.instance = new AlertEngine();
      AlertEngine.instance.init();
    }
    return AlertEngine.instance;
  }

  private init(): void {
    eventEngine.subscribe(async (event: WorkflowEvent) => {
      await this.handleWorkflowEvent(event);
    });
  }

  public async evaluateAllRules(): Promise<Alert[]> {
    const generatedAlerts: Alert[] = [];
    const now = new Date();

    // Rule 1: Check Surgeries with Missing Consent
    const surgeries = otRepository.findAllSurgeries().filter((s) => s.status === 'SCHEDULED' || s.status === 'READY');
    for (const surg of surgeries) {
      const patient = patientRepository.findById(surg.patientId);
      if (patient && patient.readiness) {
        if (patient.readiness.consentStatus === 'MISSING') {
          const alert = alertRepository.create({
            id: `alt_consent_${surg.id}`,
            severity: 'CRITICAL',
            title: `Missing Surgical Consent: ${patient.name} (${surg.otCode || 'OT'})`,
            description: `Surgery "${surg.procedureName}" is scheduled for ${new Date(surg.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} but consent is MISSING in ${patient.wardId}.`,
            entityType: 'PATIENT',
            entityId: patient.id,
            responsibleRole: 'WARD_STAFF',
            recommendedAction: `Verify and complete surgical consent in ${patient.wardId} before transfer.`,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          });
          generatedAlerts.push(alert);
        } else if (patient.readiness.consentStatus === 'VERIFIED') {
          // Auto resolve if consent was verified
          const existing = alertRepository.findOpenAlerts().find((a) => a.entityId === patient.id && a.title.includes('Missing Surgical Consent'));
          if (existing) {
            alertRepository.updateStatus(existing.id, 'RESOLVED', 'SmartOT Rule Engine (Auto-Resolved)');
          }
        }
      }

      // Rule 2: Check CSSD Pack Availability for upcoming surgeries
      const requiredPack = surg.requiredPackType;
      const availablePacks = cssdRepository.findAvailablePacksByType(requiredPack);
      if (availablePacks.length === 0 && !surg.assignedPackId) {
        const alert = alertRepository.create({
          id: `alt_pack_shortage_${surg.id}`,
          severity: 'CRITICAL',
          title: `Sterile Pack Unavailable: ${requiredPack}`,
          description: `No sterile "${requiredPack}" trays currently available in CSSD for ${surg.procedureName} in ${surg.otCode || 'OT'}.`,
          entityType: 'CSSD_PACK',
          entityId: surg.id,
          responsibleRole: 'CSSD_STAFF',
          recommendedAction: 'Expedite autoclave cycle for required surgical tray.',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        });
        generatedAlerts.push(alert);
      }
    }

    // Rule 3: Check Active Turnover Overruns
    const ots = otRepository.findAllOTs();
    for (const ot of ots) {
      if (ot.currentStatus === 'TURNOVER' && ot.turnoverStartedAt) {
        const elapsedMinutes = Math.round(
          (now.getTime() - new Date(ot.turnoverStartedAt).getTime()) / (1000 * 60)
        );
        if (elapsedMinutes > ot.expectedTurnoverMinutes) {
          const overrun = elapsedMinutes - ot.expectedTurnoverMinutes;
          const alert = alertRepository.create({
            id: `alt_turnover_${ot.id}`,
            severity: 'WARNING',
            title: `Turnover Benchmark Overrun: ${ot.code}`,
            description: `${ot.code} turnover has exceeded standard ${ot.expectedTurnoverMinutes}m benchmark by ${overrun} minutes.`,
            entityType: 'OT',
            entityId: ot.id,
            responsibleRole: 'OT_MANAGER',
            recommendedAction: 'Coordinate with housekeeping and environmental services to clear room.',
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          });
          generatedAlerts.push(alert);
        }
      }
    }

    return generatedAlerts;
  }

  private async handleWorkflowEvent(event: WorkflowEvent): Promise<void> {
    if (event.eventType === 'CONSENT_VERIFIED') {
      const openAlert = alertRepository
        .findOpenAlerts()
        .find((a) => a.entityId === event.entityId && a.title.includes('Missing Surgical Consent'));
      if (openAlert) {
        alertRepository.updateStatus(openAlert.id, 'RESOLVED', event.actorName);
      }
    } else if (event.eventType === 'CSSD_PACK_BLOCKED') {
      alertRepository.create({
        id: `alt_blocked_${Date.now()}`,
        severity: 'CRITICAL',
        title: `Compromised Pack Blocked: ${event.entityId}`,
        description: `Pack ${event.entityId} was rejected during scan due to: ${event.metadata?.reasons?.join(', ') || 'Sterility invalid'}`,
        entityType: 'CSSD_PACK',
        entityId: event.entityId,
        responsibleRole: 'CSSD_STAFF',
        recommendedAction: 'Quarantine pack and supply certified sterile alternative.',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      });
    } else if (event.eventType === 'TURNOVER_COMPLETED') {
      const openTurnoverAlert = alertRepository
        .findOpenAlerts()
        .find((a) => a.entityId === event.entityId && a.title.includes('Turnover Benchmark Overrun'));
      if (openTurnoverAlert) {
        alertRepository.updateStatus(openTurnoverAlert.id, 'RESOLVED', event.actorName);
      }
    }
  }
}

export const alertEngine = AlertEngine.getInstance();
