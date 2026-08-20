import { alertRepository } from '../repositories/alert.repository';
import { patientRepository } from '../repositories/patient.repository';
import { otRepository } from '../repositories/ot.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { eventEngine } from '../events/event-engine';
import { Alert, WorkflowEvent } from '../../../shared/src/types';
import { OPERATIONAL_BENCHMARKS } from '../../../shared/src/constants';

/**
 * AlertEngine: Event-driven alert evaluation.
 *
 * FIX: Alert rules are evaluated:
 *   1. At server startup (once, via index.ts)
 *   2. On relevant workflow events (via event subscriber)
 *   3. Via explicit POST /api/admin/evaluate-alerts (admin action)
 *
 * Alert rules are NOT evaluated on dashboard GET requests.
 * This ensures alerts are idempotent and not duplicated by browser refreshes.
 */
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
    // Subscribe to workflow events — evaluate relevant rules when operations occur
    eventEngine.subscribe(async (event: WorkflowEvent) => {
      await this.handleWorkflowEvent(event);
    });
  }

  /**
   * Full rule evaluation sweep. Call at startup and on admin request.
   * Each rule uses stable, deterministic alert IDs — safe to call multiple times (idempotent).
   */
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
            id: `alt_consent_${surg.id}`,   // Stable, predictable ID — idempotent
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
          // Auto-resolve consent alerts if consent is now verified
          alertRepository.autoResolveByEntity(patient.id, 'Missing Surgical Consent', 'SmartOT Rule Engine (Auto-Resolved)');
        }
      }

      // Rule 2: Check CSSD Pack Availability for upcoming surgeries
      const requiredPack = surg.requiredPackType;
      if (requiredPack) {
        const availablePacks = cssdRepository.findAvailablePacksByType(requiredPack);
        if (availablePacks.length === 0 && !surg.assignedPackId) {
          const alert = alertRepository.create({
            id: `alt_pack_shortage_${surg.id}`,  // Stable ID — won't duplicate
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
        } else if (availablePacks.length > 0 || surg.assignedPackId) {
          // Auto-resolve pack shortage alert if packs are now available
          alertRepository.autoResolveByEntity(surg.id, 'Sterile Pack Unavailable', 'SmartOT Rule Engine (Auto-Resolved)');
        }
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
            id: `alt_turnover_${ot.id}`,    // Stable ID — won't duplicate
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
      } else if (ot.currentStatus === 'AVAILABLE' || ot.currentStatus === 'PREPARING') {
        // Auto-resolve turnover alerts when OT returns to service
        alertRepository.autoResolveByEntity(ot.id, 'Turnover Benchmark Overrun', 'SmartOT Rule Engine (OT Available)');
      }
    }

    // Rule 4: Check CSSD Sterilization Jobs Overdue & Delayed Processing
    const jobs = cssdRepository.findAllJobs();
    for (const job of jobs) {
      if (job.status === 'PROCESSING' && job.expectedCompletionAt) {
        if (new Date().getTime() > new Date(job.expectedCompletionAt).getTime()) {
          const overrunMinutes = Math.round(
            (now.getTime() - new Date(job.expectedCompletionAt).getTime()) / 60000
          );
          alertRepository.create({
            id: `alt_cssd_delay_${job.jobId}`,
            severity: overrunMinutes > 30 ? 'CRITICAL' : 'WARNING',
            title: `Sterilization Processing Overrun: ${job.jobId} (${job.qrCode})`,
            description: `Job ${job.jobId} for "${job.instrumentName}" has exceeded expected completion duration by ${overrunMinutes} minutes.`,
            entityType: 'CSSD_PACK',
            entityId: job.id,
            responsibleRole: 'CSSD_STAFF',
            recommendedAction: `Inspect autoclave chamber and verify cycle progress for ${job.method}.`,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          });
        }
      } else if (job.status === 'RELEASED') {
        alertRepository.autoResolveByEntity(job.id, 'Sterilization Processing Overrun', 'SmartOT CSSD Engine (Cycle Released)');
      }

      // Rule 5: Quarantined or Rejected Critical Trays
      if (job.status === 'QUARANTINED' || job.status === 'REJECTED') {
        alertRepository.create({
          id: `alt_cssd_quarantine_${job.jobId}`,
          severity: 'CRITICAL',
          title: `CSSD Item ${job.status}: ${job.instrumentName}`,
          description: `Job ${job.jobId} (${job.qrCode}) was ${job.status}: ${job.rejectionReason || 'Failed verification checks'}`,
          entityType: 'CSSD_PACK',
          entityId: job.id,
          responsibleRole: 'CSSD_STAFF',
          recommendedAction: 'Repackage and queue replacement tray immediately.',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        });
      }
    }

    return generatedAlerts;
  }

  /**
   * Event-driven alert handling: reacts to specific workflow events.
   * Called automatically when events are emitted through the EventEngine.
   */
  private async handleWorkflowEvent(event: WorkflowEvent): Promise<void> {
    switch (event.eventType) {
      case 'CONSENT_VERIFIED': {
        // Auto-resolve any open consent alerts for this patient
        alertRepository.autoResolveByEntity(event.entityId, 'Missing Surgical Consent', event.actorName);
        break;
      }

      case 'READINESS_UPDATED': {
        // Re-evaluate consent and readiness alerts after any readiness update
        await this.evaluateAllRules();
        break;
      }

      case 'CSSD_PACK_BLOCKED': {
        alertRepository.create({
          id: `alt_blocked_${event.entityId}`,   // Stable per-pack ID
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
        break;
      }

      case 'CSSD_PACK_ASSIGNED':
      case 'CSSD_PACK_SCANNED': {
        // If a pack is now assigned to a surgery, resolve pack shortage alerts for that surgery
        const surgId = event.metadata?.assignedSurgeryId || event.metadata?.surgeryId;
        if (surgId) {
          alertRepository.autoResolveByEntity(surgId, 'Sterile Pack Unavailable', 'SmartOT Rule Engine (Pack Assigned)');
        }
        break;
      }

      case 'TURNOVER_COMPLETED': {
        // Resolve any open turnover overrun alert for this OT
        alertRepository.autoResolveByEntity(event.entityId, 'Turnover Benchmark Overrun', event.actorName);
        break;
      }

      case 'SURGERY_STARTED': {
        // Re-evaluate all rules when a surgery starts — catches cascade effects
        await this.evaluateAllRules();
        break;
      }

      default:
        break;
    }
  }
}

export const alertEngine = AlertEngine.getInstance();
