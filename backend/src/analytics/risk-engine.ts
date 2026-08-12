import { otRepository } from '../repositories/ot.repository';
import { patientRepository } from '../repositories/patient.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { Surgery, DelayRiskLevel } from '../../../shared/src/types';

export interface SurgeryRiskAssessment {
  surgeryId: string;
  riskLevel: DelayRiskLevel;
  score: number; // 0 to 100
  reasons: string[];
  downstreamImpacts: Array<{
    surgeryId: string;
    procedureName: string;
    scheduledStartTime: string;
    inheritedRiskLevel: DelayRiskLevel;
    estimatedDelayMinutes: number;
  }>;
}

export class DelayRiskEngine {
  public assessSurgeryRisk(surgeryId: string): SurgeryRiskAssessment {
    const surgery = otRepository.findSurgeryById(surgeryId);
    if (!surgery) {
      return {
        surgeryId,
        riskLevel: 'LOW',
        score: 0,
        reasons: ['Surgery record not found'],
        downstreamImpacts: [],
      };
    }

    let score = 0;
    const reasons: string[] = [];

    const patient = patientRepository.findById(surgery.patientId);
    if (patient?.readiness) {
      if (patient.readiness.consentStatus === 'MISSING') {
        score += 45;
        reasons.push('Surgical consent is MISSING in pre-op ward');
      } else if (patient.readiness.consentStatus === 'PENDING') {
        score += 20;
        reasons.push('Surgical consent is PENDING review');
      }

      if (patient.readiness.completedItemsCount < 6) {
        score += 20;
        reasons.push(`Pre-op readiness checklist is incomplete (${patient.readiness.completedItemsCount}/6 completed)`);
      }
    }

    // CSSD Pack check
    if (!surgery.assignedPackId) {
      const available = cssdRepository.findAvailablePacksByType(surgery.requiredPackType);
      if (available.length === 0) {
        score += 40;
        reasons.push(`No available sterile "${surgery.requiredPackType}" packs in CSSD`);
      } else if (available.length <= 1) {
        score += 15;
        reasons.push(`Low CSSD inventory buffer for "${surgery.requiredPackType}" (only 1 available)`);
      }
    }

    // OT Turnover & Upstream Delay Check
    const ot = otRepository.findOTById(surgery.otId);
    if (ot) {
      if (ot.currentDelayMinutes > 15) {
        score += 30;
        reasons.push(`${ot.code} is currently delayed by ${ot.currentDelayMinutes}m from previous operations`);
      }
      if (ot.currentStatus === 'TURNOVER') {
        score += 15;
        reasons.push(`${ot.code} currently in turnover`);
      }
    }

    let riskLevel: DelayRiskLevel = 'LOW';
    if (score >= 60) {
      riskLevel = 'HIGH';
    } else if (score >= 30) {
      riskLevel = 'MEDIUM';
    }

    // Downstream Cascading Impact Analysis
    const allSurgeriesInOT = otRepository.findSurgeriesByOT(surgery.otId);
    const downstream = allSurgeriesInOT
      .filter((s) => s.id !== surgery.id && s.scheduledStartTime > surgery.scheduledStartTime)
      .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());

    const downstreamImpacts = downstream.map((subsequent, idx) => {
      const estimatedDelay = Math.max(0, (surgery.delayMinutes || 15) - idx * 10);
      const inheritedRisk: DelayRiskLevel =
        riskLevel === 'HIGH' ? (idx === 0 ? 'HIGH' : 'MEDIUM') : riskLevel === 'MEDIUM' ? 'LOW' : 'LOW';

      return {
        surgeryId: subsequent.id,
        procedureName: subsequent.procedureName,
        scheduledStartTime: subsequent.scheduledStartTime,
        inheritedRiskLevel: inheritedRisk,
        estimatedDelayMinutes: estimatedDelay,
      };
    });

    return {
      surgeryId,
      riskLevel,
      score: Math.min(100, score),
      reasons: reasons.length > 0 ? reasons : ['All operational readiness checks within standard parameters'],
      downstreamImpacts,
    };
  }
}

export const delayRiskEngine = new DelayRiskEngine();
