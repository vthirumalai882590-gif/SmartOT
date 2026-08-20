import { otRepository } from '../repositories/ot.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { OperatingTheatre, OTState, DelayRiskLevel } from '../../../shared/src/types';

export interface OTTransitionContext {
  actorId: string;
  actorName: string;
  department?: 'OT' | 'ADMIN' | 'TRANSFER' | 'SYSTEM';
  surgeryId?: string;
  delayMinutes?: number;
  delayReason?: string;
  riskLevel?: DelayRiskLevel;
  allowOverride?: boolean;
  overrideReason?: string;
  ipAddress?: string;
}

export class OTStateService {
  /**
   * Centralized domain state machine transition for Operating Theatres.
   * Resolves canonical otId, validates state machine logic, emits workflow events, and logs audit events.
   */
  public async transitionOTStatus(
    otIdentifier: string,
    targetState: OTState,
    context: OTTransitionContext
  ): Promise<{ success: boolean; ot?: OperatingTheatre; error?: string }> {
    const canonicalOtId = otRepository.resolveOTId(otIdentifier);
    if (!canonicalOtId) {
      return { success: false, error: `Operating Theatre "${otIdentifier}" not found` };
    }

    const currentOt = otRepository.findOTById(canonicalOtId);
    if (!currentOt) {
      return { success: false, error: `Operating Theatre "${canonicalOtId}" not found` };
    }

    const previousStatus = currentOt.currentStatus;

    const result = otRepository.updateOTStatus(
      canonicalOtId,
      targetState,
      {
        activeSurgeryId: context.surgeryId,
        delayMinutes: context.delayMinutes,
        riskLevel: context.riskLevel,
      },
      context.allowOverride || false
    );

    if (!result.success || !result.ot) {
      return {
        success: false,
        error: result.error || `Invalid OT transition from "${previousStatus}" to "${targetState}"`,
      };
    }

    // Emit workflow event
    let eventType: any = 'OT_STATE_CHANGED';
    if (targetState === 'TURNOVER') eventType = 'TURNOVER_STARTED';
    else if (targetState === 'AVAILABLE') eventType = 'TURNOVER_COMPLETED';
    else if (targetState === 'SURGERY_STARTED') eventType = 'SURGERY_STARTED';
    else if (targetState === 'SURGERY_COMPLETED') eventType = 'SURGERY_COMPLETED';

    await eventEngine.emitEvent({
      eventType,
      entityType: 'OT',
      entityId: canonicalOtId,
      department: context.department || 'OT',
      actorId: context.actorId,
      actorName: context.actorName,
      metadata: {
        otId: canonicalOtId,
        otCode: result.ot.code,
        fromStatus: previousStatus,
        toStatus: targetState,
        surgeryId: context.surgeryId || result.ot.activeSurgeryId,
        delayMinutes: context.delayMinutes,
        delayReason: context.delayReason,
        isOverride: context.allowOverride || false,
        overrideReason: context.overrideReason,
      },
    });

    // Write audit record
    auditRepository.log({
      actorId: context.actorId,
      actorName: context.actorName,
      action: context.allowOverride ? 'OT_STATUS_OVERRIDE' : `OT_TRANSITION_${targetState}`,
      entityType: 'OT',
      entityId: canonicalOtId,
      previousState: { status: previousStatus, code: result.ot.code },
      newState: {
        status: targetState,
        activeSurgeryId: context.surgeryId,
        delayMinutes: context.delayMinutes,
      },
      ipAddress: context.ipAddress,
    });

    return { success: true, ot: result.ot };
  }
}

export const otStateService = new OTStateService();
