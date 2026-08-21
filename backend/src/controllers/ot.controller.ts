import { Response } from 'express';
import { otRepository } from '../repositories/ot.repository';
import { patientRepository } from '../repositories/patient.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { eventRepository } from '../repositories/event.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { delayRiskEngine } from '../analytics/risk-engine';
import { delayEngine } from '../analytics/delay-engine';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { OTState, Surgery } from '../../../shared/src/types';

export class OTController {
  public async getSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    const surgeries = otRepository.findAllSurgeries();
    const ots = otRepository.findAllOTs();

    const enrichedSurgeries = surgeries.map((surg) => {
      const riskAssessment = delayRiskEngine.assessSurgeryRisk(surg.id);
      const rootCause = surg.delayMinutes > 10 ? delayEngine.analyzeSurgeryRootCause(surg.id) : undefined;
      return {
        ...surg,
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.score,
        riskReasons: riskAssessment.reasons,
        downstreamImpacts: riskAssessment.downstreamImpacts,
        rootCause,
      };
    });

    res.json({
      success: true,
      data: {
        operatingTheatres: ots,
        surgeries: enrichedSurgeries,
      },
    });
  }

  public async getOTTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const ot = otRepository.findOTById(id);
    if (!ot) {
      res.status(404).json({ success: false, error: 'OT_NOT_FOUND' });
      return;
    }

    // Find all workflow events associated with this OT or its active/past surgeries
    const allEvents = eventRepository.findAll();
    const otEvents = allEvents.filter(
      (e) =>
        e.entityId === ot.id ||
        e.entityId === ot.code ||
        e.metadata?.otId === ot.id ||
        e.metadata?.otCode === ot.code ||
        (ot.activeSurgeryId && e.entityId === ot.activeSurgeryId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      success: true,
      data: otEvents,
    });
  }

  public async transitionOTState(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { targetState, surgeryId, delayMinutes, delayReason, isOverride, overrideReason } = req.body;
    const actor = req.user || { userId: 'system', email: 'otmanager@smartot.hospital', role: 'OT_MANAGER', department: 'OT' };

    const ot = otRepository.findOTById(id);

    if (!ot) {
      res.status(404).json({ success: false, error: 'OT_NOT_FOUND' });
      return;
    }

    const activeSurgery = surgeryId
      ? otRepository.findSurgeryById(surgeryId)
      : ot.activeSurgeryId
      ? otRepository.findSurgeryById(ot.activeSurgeryId)
      : undefined;

    const prevState = ot.currentStatus;

    // ─── 1. CLINICAL & RESOURCE VALIDATION GATES (Unless Manual Override) ───
    if (!isOverride) {
      const blockingReasons: string[] = [];

      // Validation when moving to PATIENT_READY or PATIENT_ARRIVED
      if (['PATIENT_READY', 'PATIENT_ARRIVED', 'OT_READY'].includes(targetState) && activeSurgery) {
        // A. Patient Readiness & Consent Check
        const patient = patientRepository.findById(activeSurgery.patientId);
        if (patient) {
          const readiness = patient.readiness || patientRepository.getReadiness(patient.id);
          if (readiness) {
            if (readiness.consentStatus !== 'VERIFIED') {
              blockingReasons.push(`Surgical consent is ${readiness.consentStatus} — must be VERIFIED in ward`);
            }
            if (!readiness.documentationCompleted) {
              blockingReasons.push('Pre-anesthesia PAC documentation clearance incomplete');
            }
            if (!readiness.preopPrepCompleted) {
              blockingReasons.push('Pre-op fasting (NPO) or surgical site prep incomplete');
            }
          } else {
            blockingReasons.push('Patient readiness record not initialized');
          }
        }

        // B. CSSD Sterile Pack Check
        if (activeSurgery.assignedPackId) {
          const pack = cssdRepository.findPackById(activeSurgery.assignedPackId);
          if (!pack) {
            blockingReasons.push(`Assigned CSSD pack "${activeSurgery.assignedPackId}" not found in sterile inventory`);
          } else {
            if (new Date(pack.expiresAt) < new Date() || pack.sterilityStatus === 'EXPIRED') {
              blockingReasons.push(`Sterile pack ${pack.packId} expired on ${new Date(pack.expiresAt).toLocaleDateString()}`);
            }
            if (pack.currentStatus === 'BLOCKED' || pack.currentStatus === 'STERILIZING') {
              blockingReasons.push(`Sterile pack ${pack.packId} is currently ${pack.currentStatus}`);
            }
          }
        } else if (activeSurgery.requiredPackType) {
          // Check if at least one available pack exists in sterile storage
          const availablePacks = cssdRepository.findAvailablePacksByType(activeSurgery.requiredPackType);
          if (availablePacks.length === 0) {
            blockingReasons.push(`No available sterile "${activeSurgery.requiredPackType}" packs in CSSD inventory`);
          }
        }
      }

      if (blockingReasons.length > 0) {
        res.status(422).json({
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'OT cannot be transitioned to the requested state.',
          reasons: blockingReasons,
        });
        return;
      }
    }

    // ─── 2. EXECUTE STATE TRANSITION ─────────────────────────────────────────
    const result = otRepository.updateOTStatus(
      id,
      targetState as OTState,
      { delayMinutes, activeSurgeryId: activeSurgery?.id },
      Boolean(isOverride)
    );

    if (!result.success || !result.ot) {
      res.status(400).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: result.error || 'Invalid transition for current lifecycle state.',
      });
      return;
    }

    const now = new Date();
    const serverTimeIso = now.toISOString();

    // ─── 3. HANDLE SPECIFIC WORKFLOW STATE EFFECTS ────────────────────────────
    if (activeSurgery) {
      if (targetState === 'PATIENT_READY') {
        const patRes = patientRepository.updateStatus(activeSurgery.patientId, 'READY_FOR_OT');
        if (!patRes.success) console.warn(`[OT] Patient state transition warning: ${patRes.error}`);
        await eventEngine.emitEvent({
          eventType: 'PATIENT_READY',
          entityType: 'PATIENT',
          entityId: activeSurgery.patientId,
          department: 'WARD',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: { otCode: result.ot.code, surgeryId: activeSurgery.id },
        });
      } else if (targetState === 'PATIENT_TRANSFER') {
        const patRes = patientRepository.updateStatus(activeSurgery.patientId, 'IN_TRANSFER');
        if (!patRes.success) console.warn(`[OT] Patient state transition warning: ${patRes.error}`);
        await eventEngine.emitEvent({
          eventType: 'TRANSFER_STARTED',
          entityType: 'PATIENT',
          entityId: activeSurgery.patientId,
          department: 'TRANSFER',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: { otCode: result.ot.code, toOtId: result.ot.id, surgeryId: activeSurgery.id },
        });
      } else if (targetState === 'PATIENT_ARRIVED') {
        const patRes = patientRepository.updateStatus(activeSurgery.patientId, 'IN_OT');
        if (!patRes.success) console.warn(`[OT] Patient state transition warning: ${patRes.error}`);
        await eventEngine.emitEvent({
          eventType: 'PATIENT_ARRIVED_OT',
          entityType: 'PATIENT',
          entityId: activeSurgery.patientId,
          department: 'OT',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: { otCode: result.ot.code, surgeryId: activeSurgery.id },
        });
      } else if (targetState === 'SURGERY_STARTED') {
        // Automatic delay detection
        let autoDelayMinutes = delayMinutes || 0;
        const scheduledTime = new Date(activeSurgery.scheduledStartTime);
        if (now > scheduledTime) {
          const computedDelay = Math.max(0, Math.round((now.getTime() - scheduledTime.getTime()) / 60000));
          autoDelayMinutes = Math.max(autoDelayMinutes, computedDelay);
        }

        otRepository.updateSurgery(activeSurgery.id, {
          status: 'IN_PROGRESS',
          actualStartTime: serverTimeIso,
          delayMinutes: autoDelayMinutes,
          delayReason: delayReason || (autoDelayMinutes > 0 ? 'Induction / Readiness latency' : undefined),
        });

        const patRes = patientRepository.updateStatus(activeSurgery.patientId, 'IN_SURGERY');
        if (!patRes.success) console.warn(`[OT] Patient state transition warning: ${patRes.error}`);

        if (autoDelayMinutes > 0) {
          await eventEngine.emitEvent({
            eventType: 'OT_DELAY_DETECTED',
            entityType: 'SURGERY',
            entityId: activeSurgery.id,
            department: 'OT',
            actorId: actor.userId,
            actorName: actor.email,
            metadata: {
              otCode: result.ot.code,
              delayMinutes: autoDelayMinutes,
              reason: delayReason || 'Surgical start exceeded scheduled window',
            },
          });
        }

        await eventEngine.emitEvent({
          eventType: 'SURGERY_STARTED',
          entityType: 'SURGERY',
          entityId: activeSurgery.id,
          department: 'OT',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: {
            otCode: result.ot.code,
            patientId: activeSurgery.patientId,
            delayMinutes: autoDelayMinutes,
            startTime: serverTimeIso,
          },
        });
      } else if (targetState === 'SURGERY_COMPLETED') {
        // Automatic duration calculation
        const startTime = new Date(activeSurgery.actualStartTime || activeSurgery.scheduledStartTime);
        const actualDurationMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000));

        otRepository.updateSurgery(activeSurgery.id, {
          status: 'COMPLETED',
          actualEndTime: serverTimeIso,
          actualDurationMinutes,
        });

        const postRes = patientRepository.updateStatus(activeSurgery.patientId, 'POST_OP');
        if (!postRes.success) console.warn(`[OT] Patient state transition warning: ${postRes.error}`);

        await eventEngine.emitEvent({
          eventType: 'SURGERY_COMPLETED',
          entityType: 'SURGERY',
          entityId: activeSurgery.id,
          department: 'OT',
          actorId: actor.userId,
          actorName: actor.email,
          metadata: {
            otCode: result.ot.code,
            actualDurationMinutes,
            endTime: serverTimeIso,
          },
        });
      }
    }

    if (targetState === 'TURNOVER') {
      await eventEngine.emitEvent({
        eventType: 'TURNOVER_STARTED',
        entityType: 'OT',
        entityId: result.ot.id,
        department: 'OT',
        actorId: actor.userId,
        actorName: actor.email,
        metadata: {
          otCode: result.ot.code,
          expectedDurationMinutes: result.ot.expectedTurnoverMinutes,
          turnoverStartedAt: serverTimeIso,
        },
      });
    } else if (targetState === 'AVAILABLE') {
      await eventEngine.emitEvent({
        eventType: 'OT_AVAILABLE',
        entityType: 'OT',
        entityId: result.ot.id,
        department: 'OT',
        actorId: actor.userId,
        actorName: actor.email,
        metadata: { otCode: result.ot.code, availableAt: serverTimeIso },
      });
    }

    // General state change event
    await eventEngine.emitEvent({
      eventType: isOverride ? 'OT_MANUAL_OVERRIDE' : 'OT_STATE_CHANGED',
      entityType: 'OT',
      entityId: result.ot.id,
      department: 'OT',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        otCode: result.ot.code,
        fromState: prevState,
        toState: targetState,
        isOverride: Boolean(isOverride),
        overrideReason,
        delayReason,
      },
    });

    // Audit Logging
    res.json({
      success: true,
      data: {
        ot: result.ot,
        activeSurgery: activeSurgery ? otRepository.findSurgeryById(activeSurgery.id) : undefined,
      },
    });
  }

  public async scheduleCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        otId,
        patientId,
        procedureName,
        surgeonName,
        scheduledStartTime,
        expectedDurationMinutes,
        priority,
        requiredPackType,
      } = req.body;

      const actor = req.user || { userId: 'system', email: 'admin@smartot.hospital', role: 'OT_MANAGER', department: 'OT' };

      const canonicalOtId = otRepository.resolveOTId(otId) || otId;
      const ot = otRepository.findOTById(canonicalOtId);
      if (!ot) {
        res.status(404).json({ success: false, error: 'OT_NOT_FOUND', message: 'Operating Theatre not found' });
        return;
      }

      if ((ot as any).archived) {
        res.status(400).json({ success: false, error: 'OT_ARCHIVED', message: 'Cannot schedule into an archived theatre' });
        return;
      }

      const patient = patientRepository.findById(patientId);
      if (!patient) {
        res.status(404).json({ success: false, error: 'PATIENT_NOT_FOUND', message: 'Patient not found' });
        return;
      }

      const surgeryId = `surg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const startTimeIso = scheduledStartTime || new Date(Date.now() + 30 * 60000).toISOString();

      const packType = requiredPackType || 'Appendectomy Set';
      const availablePacks = cssdRepository.findAvailablePacksByType(packType);
      let assignedPackId: string | undefined = undefined;
      if (availablePacks.length > 0) {
        assignedPackId = availablePacks[0].id;
        cssdRepository.transitionPackStatus(assignedPackId, 'ASSIGNED', {
          assignedOtId: ot.id,
          assignedSurgeryId: surgeryId,
          assignedPatientId: patient.id,
        });
      }

      const newSurgery: Surgery = {
        id: surgeryId,
        patientId: patient.id,
        patientName: patient.name,
        patientMrn: patient.mrn,
        procedureName: procedureName || patient.primaryDiagnosis || 'Surgical Procedure',
        surgeonName: surgeonName || 'Dr. Emily Watson, MD',
        anesthesiologistName: 'Dr. Robert Blake, MD',
        otId: ot.id,
        otCode: ot.code,
        scheduledStartTime: startTimeIso,
        expectedDurationMinutes: Number(expectedDurationMinutes) || 90,
        priority: priority || 'ELECTIVE',
        status: 'SCHEDULED',
        requiredPackType: packType,
        assignedPackId,
        delayMinutes: 0,
        riskLevel: 'LOW',
        createdAt: new Date().toISOString(),
      };

      otRepository.createSurgery(newSurgery);

      // Update patient activeSurgeryId & status
      const schedRes = patientRepository.updateStatus(patient.id, 'PREPARING');
      if (!schedRes.success) console.warn(`[OT] Patient state transition warning on scheduling: ${schedRes.error}`);
      (patient as any).activeSurgeryId = surgeryId;

      // Update OT state to SCHEDULED or PREPARING
      otRepository.updateOTStatus(ot.id, 'SCHEDULED', { activeSurgeryId: surgeryId }, true);

      await eventEngine.emitEvent({
        eventType: 'SURGERY_SCHEDULED',
        entityType: 'SURGERY',
        entityId: surgeryId,
        department: 'OT',
        actorId: actor.userId,
        actorName: actor.email,
        metadata: {
          otCode: ot.code,
          patientName: patient.name,
          procedureName: newSurgery.procedureName,
          scheduledStartTime: startTimeIso,
        },
      });

      auditRepository.log({
        actorId: actor.userId,
        actorName: actor.email,
        action: 'SCHEDULE_SURGERY_CASE',
        entityType: 'SURGERY',
        entityId: surgeryId,
        previousState: null,
        newState: newSurgery,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: {
          surgery: newSurgery,
          ot: otRepository.findOTById(ot.id),
        },
        message: `Surgery scheduled for ${patient.name} in ${ot.code}.`,
      });
    } catch (err: any) {
      console.error('[OT] scheduleCase exception:', err);
      res.status(500).json({
        success: false,
        error: 'SCHEDULE_FAILED',
        message: err.message || 'Failed to schedule surgical case',
      });
    }
  }
}

export const otController = new OTController();
