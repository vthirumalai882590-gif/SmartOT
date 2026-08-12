import { correlationEngine } from '../events/correlation-engine';
import { otRepository } from '../repositories/ot.repository';
import { OPERATIONAL_BENCHMARKS } from '../../../shared/src/constants';

export interface RootCauseAnalysisResult {
  surgeryId: string;
  delayMinutes: number;
  isDelayed: boolean;
  primaryContributingFactor:
    | 'PATIENT_TRANSFER'
    | 'CSSD_AVAILABILITY'
    | 'CONSENT_MISSING'
    | 'DOCUMENTATION'
    | 'TURNOVER_OVERRUN'
    | 'PREVIOUS_CASE_DELAY'
    | 'NONE';
  explanation: string;
  contributingFactors: Array<{
    factor: string;
    impactMinutes: number;
    evidence: string;
  }>;
}

export class DelayEngine {
  public analyzeSurgeryRootCause(surgeryId: string): RootCauseAnalysisResult {
    const timeline = correlationEngine.correlateSurgeryTimeline(surgeryId);
    const surgery = otRepository.findSurgeryById(surgeryId);

    if (!surgery || !timeline) {
      return {
        surgeryId,
        delayMinutes: 0,
        isDelayed: false,
        primaryContributingFactor: 'NONE',
        explanation: 'No workflow records found for analysis.',
        contributingFactors: [],
      };
    }

    const delayMinutes = surgery.delayMinutes || 0;
    const isDelayed = delayMinutes > OPERATIONAL_BENCHMARKS.SCHEDULE_DELAY_THRESHOLD_MINUTES;

    if (!isDelayed) {
      return {
        surgeryId,
        delayMinutes,
        isDelayed: false,
        primaryContributingFactor: 'NONE',
        explanation: 'Case started within standard operational tolerance threshold.',
        contributingFactors: [],
      };
    }

    const factors: Array<{ factor: string; impactMinutes: number; evidence: string }> = [];

    // Check Consent & Readiness
    if (timeline.stages.readiness?.consent === 'MISSING') {
      factors.push({
        factor: 'CONSENT_MISSING',
        impactMinutes: Math.min(delayMinutes, 20),
        evidence: 'Surgical consent was missing in ward prior to scheduled start time.',
      });
    }

    // Check Transfer Duration
    if (timeline.stages.transfer?.durationMinutes && timeline.stages.transfer.durationMinutes > OPERATIONAL_BENCHMARKS.TRANSFER_BENCHMARK_MINUTES) {
      const transferOverrun = timeline.stages.transfer.durationMinutes - OPERATIONAL_BENCHMARKS.TRANSFER_BENCHMARK_MINUTES;
      factors.push({
        factor: 'PATIENT_TRANSFER',
        impactMinutes: transferOverrun,
        evidence: `Inpatient transfer took ${timeline.stages.transfer.durationMinutes}m (Benchmark is ${OPERATIONAL_BENCHMARKS.TRANSFER_BENCHMARK_MINUTES}m).`,
      });
    }

    // Check CSSD delay
    if (!timeline.stages.cssdVerification) {
      factors.push({
        factor: 'CSSD_AVAILABILITY',
        impactMinutes: 15,
        evidence: 'Sterile instrument pack verification was delayed or missing at scheduled start.',
      });
    }

    // Check Previous Case in the same OT
    const allSurgeriesInOT = otRepository.findSurgeriesByOT(surgery.otId);
    const priorSurgery = allSurgeriesInOT.find(
      (s) => s.id !== surgery.id && s.scheduledStartTime < surgery.scheduledStartTime && s.delayMinutes > 10
    );
    if (priorSurgery) {
      factors.push({
        factor: 'PREVIOUS_CASE_DELAY',
        impactMinutes: priorSurgery.delayMinutes,
        evidence: `Prior surgery "${priorSurgery.procedureName}" ran ${priorSurgery.delayMinutes}m late in ${surgery.otCode || 'OT'}.`,
      });
    }

    // Determine primary factor
    factors.sort((a, b) => b.impactMinutes - a.impactMinutes);
    const primary = (factors[0]?.factor as any) || 'PREVIOUS_CASE_DELAY';

    return {
      surgeryId,
      delayMinutes,
      isDelayed: true,
      primaryContributingFactor: primary,
      explanation: `Primary operational contributor based on recorded workflow events: ${primary.replace(/_/g, ' ')}.`,
      contributingFactors: factors,
    };
  }
}

export const delayEngine = new DelayEngine();
