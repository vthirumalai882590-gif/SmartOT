import { AIOperationsContext, AIConsultantResponse } from '../../../shared/src/types';
import { aiIntentExtractor } from './ai-intent';
import { otRepository } from '../repositories/ot.repository';
import { patientRepository } from '../repositories/patient.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { alertRepository } from '../repositories/alert.repository';
import { delayRiskEngine } from '../analytics/risk-engine';
import { delayEngine } from '../analytics/delay-engine';
import { whatIfSimulator } from '../analytics/simulator';

export class DynamicOperationsConsultant {
  public async generateConsultation(
    query: string,
    context: AIOperationsContext
  ): Promise<AIConsultantResponse> {
    const parsed = aiIntentExtractor.parse(query);
    const nowIso = new Date().toISOString();
    const disclaimer =
      'Operational decision support only. Derived from live surgical suite telemetry. Clinical decisions remain the sole responsibility of licensed medical staff.';

    // =========================================================================
    // CSSD OPERATIONAL DATA QUERY HANDLER
    // =========================================================================
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes('cssd') ||
      lowerQuery.includes('sterilization') ||
      lowerQuery.includes('steriliz') ||
      lowerQuery.includes('set-021') ||
      lowerQuery.includes('instrument') ||
      lowerQuery.includes('autoclave') ||
      lowerQuery.includes('tray') ||
      lowerQuery.includes('reprocess') ||
      lowerQuery.includes('pack')
    ) {
      const items = cssdRepository.findAllItems();
      const jobs = cssdRepository.findAllJobs();
      const metrics = cssdRepository.getMetrics();
      const surgeries = otRepository.findAllSurgeries();

      const processingJobs = jobs.filter((j) => j.status === 'PROCESSING');
      const queuedJobs = jobs.filter((j) => j.status === 'QUEUED');
      const delayedJobs = jobs.filter(
        (j) => j.status === 'PROCESSING' && j.expectedCompletionAt && new Date(j.expectedCompletionAt).getTime() < Date.now()
      );

      const targetSet21 = items.find((i) => i.qrCode === 'SET-021' || i.id === 'item_021');

      const evidence: string[] = [];
      const likelyContributors: string[] = [];
      const recommendedActions: string[] = [];

      evidence.push(`Sterile Items Available: ${metrics.sterileItemsAvailable}`);
      evidence.push(`Currently Processing: ${metrics.currentlyProcessing} job(s)`);
      evidence.push(`Waiting for Sterilization (Queued): ${metrics.waitingForSterilization} job(s)`);
      evidence.push(`Release Pending Verification: ${metrics.releasePending} job(s)`);
      evidence.push(`Completed Today: ${metrics.completedToday} cycle(s)`);

      for (const j of processingJobs) {
        evidence.push(
          `Job ${j.jobId} (${j.qrCode} - ${j.instrumentName}): Status ${j.status}, Method "${j.method}", Started ${new Date(j.processingStartedAt || j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Expected Completion: ${j.expectedCompletionAt ? new Date(j.expectedCompletionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}, OT: ${j.sourceOT || 'CSSD'}, Surgery: ${j.associatedSurgeryId || 'N/A'}`
        );
      }

      for (const j of queuedJobs) {
        evidence.push(
          `Job ${j.jobId} (${j.qrCode} - ${j.instrumentName}): QUEUED, Submitted by ${j.submittedBy} at ${new Date(j.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, OT: ${j.sourceOT || 'CSSD'}`
        );
      }

      const affectedSurgeries = surgeries.filter((s) => {
        const matchingJob = jobs.find(
          (j) =>
            (j.associatedSurgeryId === s.id || j.instrumentName.toLowerCase().includes(s.requiredPackType.toLowerCase())) &&
            ['QUEUED', 'PROCESSING', 'RELEASE_PENDING'].includes(j.status)
        );
        return Boolean(matchingJob);
      });

      if (affectedSurgeries.length > 0) {
        for (const surg of affectedSurgeries) {
          likelyContributors.push(
            `Surgery "${surg.procedureName}" in ${surg.otCode || surg.otId} (Surgeon: ${surg.surgeonName}) requires ${surg.requiredPackType} which is currently undergoing CSSD reprocessing.`
          );
          recommendedActions.push(
            `Expedite release verification for ${surg.requiredPackType} to avoid delay for surgery "${surg.procedureName}" in ${surg.otCode || surg.otId}.`
          );
        }
      }

      if (targetSet21) {
        evidence.push(
          `SET-021 Profile: "${targetSet21.name}" - Current Status: ${targetSet21.currentStatus}, Location: ${targetSet21.location}, Last Sterilized: ${targetSet21.lastSterilizedAt ? new Date(targetSet21.lastSterilizedAt).toLocaleString() : 'N/A'}, Released By: ${targetSet21.releasedBy || 'N/A'}`
        );
      }

      let summary = `CSSD Operations Live Status: ${metrics.sterileItemsAvailable} sterile items available, ${metrics.currentlyProcessing} processing in autoclaves, ${metrics.waitingForSterilization} queued, and ${metrics.releasePending} pending release check.`;

      if (delayedJobs.length > 0) {
        summary += ` Warning: ${delayedJobs.length} sterilization job(s) (${delayedJobs.map((j) => j.jobId).join(', ')}) exceed configured cycle duration benchmarks.`;
        likelyContributors.push(`Autoclave processing delays detected for job(s): ${delayedJobs.map((j) => `${j.jobId} (${j.qrCode})`).join(', ')}.`);
        recommendedActions.push(`Inspect autoclave chamber and verify cycle parameters for delayed job(s): ${delayedJobs.map((j) => j.jobId).join(', ')}.`);
      }

      if (likelyContributors.length === 0) {
        likelyContributors.push('CSSD reprocessing throughput is operating within standard parameters.');
      }
      if (recommendedActions.length === 0) {
        recommendedActions.push('Maintain active monitoring of sterilization queue and release verification checks.');
      }

      return {
        summary,
        likelyContributors,
        evidence,
        recommendedActions,
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 1. SPECIFIC OT QUERY (e.g. "Why is OT-03 delayed?", "Status of OT-01")
    // =========================================================================
    if (parsed.entities.otCode || (parsed.intent === 'DELAY_ROOT_CAUSE' && parsed.entities.otCode)) {
      const otCode = parsed.entities.otCode!;
      const ots = otRepository.findAllOTs();
      const targetOT = ots.find((o) => o.code.toUpperCase() === otCode.toUpperCase() || o.id === otCode);

      if (!targetOT) {
        return {
          summary: `Insufficient operational data for ${otCode}. Operating Theatre record was not found in the live system.`,
          likelyContributors: ['Unrecognized theatre identifier in current telemetry stream.'],
          evidence: [`Queried code: ${otCode}`, `Registered theatres: ${ots.map((o) => o.code).join(', ')}`],
          recommendedActions: ['Verify operating theatre code with the surgical coordinator.'],
          uncertaintyLimitations: disclaimer,
          timestamp: nowIso,
        };
      }

      const activeSurgery = targetOT.activeSurgeryId
        ? otRepository.findSurgeryById(targetOT.activeSurgeryId)
        : otRepository.findSurgeriesByOT(targetOT.id).find((s) => s.status === 'SCHEDULED' || s.status === 'READY' || s.status === 'IN_PROGRESS');

      const patient = activeSurgery ? patientRepository.findById(activeSurgery.patientId) : undefined;
      const readiness = patient?.readiness || (patient ? patientRepository.getReadiness(patient.id) : undefined);
      const openAlerts = alertRepository.findOpenAlerts().filter((a) => a.entityId === targetOT.id || (patient && a.entityId === patient.id) || (activeSurgery && a.entityId === activeSurgery.id));

      const contributors: string[] = [];
      const evidence: string[] = [];
      const actions: string[] = [];

      evidence.push(`${targetOT.code} current status: ${targetOT.currentStatus} (${targetOT.name})`);
      evidence.push(`Current operational delay: ${targetOT.currentDelayMinutes} mins (Risk Level: ${targetOT.riskLevel})`);

      if (activeSurgery) {
        evidence.push(`Active / Scheduled Procedure: "${activeSurgery.procedureName}" (${activeSurgery.surgeonName})`);
        evidence.push(`Scheduled Start: ${new Date(activeSurgery.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      }

      if (patient && readiness) {
        evidence.push(`Patient: ${patient.name} (${patient.mrn}) in ${patient.wardId}`);
        evidence.push(`Pre-op readiness checklist: ${readiness.completedItemsCount}/${readiness.totalItemsCount} completed (Consent: ${readiness.consentStatus})`);

        if (readiness.consentStatus !== 'VERIFIED') {
          contributors.push(`Inpatient surgical consent verification is ${readiness.consentStatus} in ${patient.wardId}.`);
          actions.push(`Expedite patient and surrogate consent verification in ${patient.wardId} prior to transport.`);
        }
        if (readiness.completedItemsCount < readiness.totalItemsCount) {
          contributors.push(`Pre-op readiness checklist incomplete (${readiness.completedItemsCount}/${readiness.totalItemsCount} items completed).`);
          actions.push(`Complete outstanding pre-operative ward documentation for ${patient.name}.`);
        }
      }

      if (targetOT.currentStatus === 'TURNOVER' && targetOT.turnoverStartedAt) {
        const elapsed = Math.round((Date.now() - new Date(targetOT.turnoverStartedAt).getTime()) / 60000);
        contributors.push(`Room turnover is active (${elapsed}m elapsed vs ${targetOT.expectedTurnoverMinutes}m standard benchmark).`);
        actions.push(`Dispatch auxiliary housekeeping staff to accelerate terminal cleaning in ${targetOT.code}.`);
      }

      if (openAlerts.length > 0) {
        for (const alert of openAlerts) {
          evidence.push(`Active Alert [${alert.severity}]: "${alert.title}"`);
          if (alert.recommendedAction) {
            actions.push(alert.recommendedAction);
          }
        }
      }

      if (activeSurgery?.requiredPackType) {
        const sterilePacks = cssdRepository.findAvailablePacksByType(activeSurgery.requiredPackType);
        if (sterilePacks.length === 0 && !activeSurgery.assignedPackId) {
          contributors.push(`Sterile pack shortage: No "${activeSurgery.requiredPackType}" trays currently available in CSSD.`);
          actions.push(`Expedite autoclave cycle for required ${activeSurgery.requiredPackType} tray.`);
        } else {
          evidence.push(`Sterile pack (${activeSurgery.requiredPackType}) availability verified in Central Sterile inventory.`);
        }
      }

      if (contributors.length === 0) {
        contributors.push(`${targetOT.code} operations are proceeding within standard parameters.`);
        actions.push('Continue monitoring surgical progression and prepare for scheduled turnover.');
      }

      const summary = targetOT.currentDelayMinutes > 0
        ? `${targetOT.code} (${targetOT.specialty}) is currently delayed by ${targetOT.currentDelayMinutes} minutes in state "${targetOT.currentStatus}". Primary factor: ${contributors[0]}`
        : `${targetOT.code} (${targetOT.specialty}) is currently in state "${targetOT.currentStatus}" with LOW operational delay risk (0 mins delay).`;

      return {
        summary,
        likelyContributors: contributors,
        evidence,
        recommendedActions: actions,
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 2. PATIENT-SPECIFIC QUERY (e.g. "Status of Patient P-1024", "Is Arthur ready?")
    // =========================================================================
    if (parsed.entities.patientIdentifier) {
      const ident = parsed.entities.patientIdentifier;
      const identNum = ident.replace(/[^0-9]/g, '');
      const patients = patientRepository.findAll();
      const patient = patients.find(
        (p) =>
          p.mrn.toLowerCase() === ident.toLowerCase() ||
          p.id.toLowerCase() === ident.toLowerCase() ||
          p.name.toLowerCase().includes(ident.toLowerCase()) ||
          (identNum.length >= 3 && (p.id.includes(identNum) || p.mrn.includes(identNum)))
      );

      if (!patient) {
        return {
          summary: `Insufficient operational data for patient "${ident}". Record not found in live admissions registry.`,
          likelyContributors: ['Unmatched patient identifier in active hospital database.'],
          evidence: [`Queried identifier: ${ident}`],
          recommendedActions: ['Verify patient Medical Record Number (MRN) with Ward Admissions.'],
          uncertaintyLimitations: disclaimer,
          timestamp: nowIso,
        };
      }

      const readiness = patient.readiness || patientRepository.getReadiness(patient.id);
      const surgery = otRepository.findAllSurgeries().find((s) => s.patientId === patient.id);
      const ot = surgery ? otRepository.findOTById(surgery.otId) : undefined;

      const evidence: string[] = [
        `Patient: ${patient.name} (MRN: ${patient.mrn} / P-${patient.id.replace('pat_', '')}), Age ${patient.age}, Ward: ${patient.wardId}, Bed: ${patient.bedNumber}`,
        `Current Status: ${patient.status}, Primary Diagnosis: ${patient.primaryDiagnosis}`,
      ];

      const contributors: string[] = [];
      const actions: string[] = [];

      if (readiness) {
        evidence.push(`Checklist: ${readiness.completedItemsCount}/${readiness.totalItemsCount} complete, Consent: ${readiness.consentStatus}`);
        if (!readiness.isReady) {
          contributors.push(`Readiness incomplete: Consent is ${readiness.consentStatus} and ${6 - readiness.completedItemsCount} items remaining.`);
          actions.push(`Complete ward verification checklist in ${patient.wardId}.`);
        }
      }

      if (surgery) {
        evidence.push(`Assigned Procedure: "${surgery.procedureName}" in ${ot?.code || 'designated OT'}`);
        if (surgery.delayMinutes > 0) {
          evidence.push(`Surgery Delay: +${surgery.delayMinutes} mins (Risk: ${surgery.riskLevel})`);
        }
      }

      return {
        summary: `Patient ${patient.name} (${patient.mrn}) is currently in status "${patient.status}" in ${patient.wardId}. Pre-op readiness is ${readiness?.isReady ? '100% COMPLETE' : `${readiness?.completedItemsCount || 0}/6 items completed (Consent: ${readiness?.consentStatus})`}.`,
        likelyContributors: contributors.length > 0 ? contributors : ['Patient workflow is on schedule.'],
        evidence,
        recommendedActions: actions.length > 0 ? actions : ['Maintain standard pre-operative observation and staging.'],
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 3. RISK ASSESSMENT QUERY (e.g. "Which OT is most at risk?")
    // =========================================================================
    if (parsed.intent === 'RISK_ASSESSMENT') {
      const ots = otRepository.findAllOTs();
      const scoredOTs = ots.map((ot) => {
        const surgery = ot.activeSurgeryId ? otRepository.findSurgeryById(ot.activeSurgeryId) : undefined;
        const risk = surgery ? delayRiskEngine.assessSurgeryRisk(surgery.id) : { score: ot.currentDelayMinutes * 2, riskLevel: ot.riskLevel, reasons: [] };
        return { ot, surgery, risk };
      });

      scoredOTs.sort((a, b) => b.risk.score - a.risk.score);
      const topRisk = scoredOTs[0];

      const evidence = scoredOTs.map(
        (item) => `${item.ot.code} (${item.ot.specialty}): Risk Level ${item.risk.riskLevel} (Score: ${item.risk.score}/100, Delay: ${item.ot.currentDelayMinutes}m)`
      );

      const contributors = topRisk ? topRisk.risk.reasons : ['All theatres currently operating within standard buffers.'];
      const actions = [
        topRisk ? `Prioritize operational bottleneck resolution in ${topRisk.ot.code} (${topRisk.ot.specialty}).` : 'Maintain current schedule execution.',
        'Review downstream surgery start buffers for high-risk operating rooms.',
      ];

      return {
        summary: topRisk && topRisk.risk.score > 20
          ? `${topRisk.ot.code} (${topRisk.ot.specialty}) has the HIGHEST delay risk score (${topRisk.risk.score}/100, ${topRisk.risk.riskLevel} Risk), with ${topRisk.ot.currentDelayMinutes}m active delay.`
          : 'All Operating Theatres are operating with LOW risk profiles within standard schedule tolerance limits.',
        likelyContributors: contributors,
        evidence,
        recommendedActions: actions,
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 4. BOTTLENECK ANALYSIS QUERY (e.g. "What are today's biggest bottlenecks?")
    // =========================================================================
    if (parsed.intent === 'BOTTLENECK_ANALYSIS') {
      const bottlenecks = context.bottlenecks || [];
      const topBottlenecks = [...bottlenecks].sort((a, b) => b.percentage - a.percentage);

      const evidence = topBottlenecks.map(
        (b) => `${b.name}: ${b.percentage}% of total delay time (${b.totalDelayMinutes} lost minutes across ${b.caseCount} cases, Trend: ${b.trend})`
      );

      const contributors = topBottlenecks.slice(0, 3).map((b) => `${b.name} accounts for ${b.percentage}% of surgical delay time.`);
      const actions = [
        'Enforce mandatory T-30 minute ward readiness audits to prevent patient transport holds.',
        'Pre-stage sterile instrument trays at least 2 hours prior to scheduled case incision.',
        'Implement parallel turnover cleaning protocols during patient transfer out.',
      ];

      return {
        summary: topBottlenecks.length > 0
          ? `${topBottlenecks[0].name} (${topBottlenecks[0].percentage}%) and ${topBottlenecks[1]?.name || 'Turnover'} (${topBottlenecks[1]?.percentage || 0}%) represent the primary operational delay drivers today.`
          : 'Surgical suite flow is operating nominally with no significant bottleneck clusters detected.',
        likelyContributors: contributors,
        evidence,
        recommendedActions: actions,
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 5. NEXT-BEST-ACTIONS & PRIORITIES QUERY (e.g. "What should we prioritize?")
    // =========================================================================
    if (parsed.intent === 'PRIORITY_ACTIONS') {
      const actions = context.nextBestActions || [];
      const topActions = actions.slice(0, 3);

      const evidence = topActions.map(
        (a) => `[${a.priority} PRIORITY] (Impact ${a.impactScore}/100) ${a.action} — ${a.rationale}`
      );

      return {
        summary: topActions.length > 0
          ? `Top Operational Priority: "${topActions[0].action}" (Impact Score: ${topActions[0].impactScore}/100, Department: ${topActions[0].department}).`
          : 'All scheduled cases are progressing normally. No immediate priority interventions required.',
        likelyContributors: topActions.map((a) => a.rationale),
        evidence,
        recommendedActions: topActions.map((a) => a.action),
        uncertaintyLimitations: disclaimer,
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 6. WHAT-IF TURNOVER SIMULATION QUERY
    // =========================================================================
    if (parsed.intent === 'TURNOVER_SIMULATION') {
      const sim = whatIfSimulator.runSimulation({
        turnoverReductionMinutes: 10,
        transferOptimizationMinutes: 5,
        prepChecklistAutomationHours: 1,
      });

      return {
        summary: `Reducing turnover time by 10m and transfer by 5m increases overall suite utilization from ${sim.baselineUtilization}% to ${sim.simulatedUtilization}% (+${sim.utilizationGainPercentage}% gain), recovering ~${sim.savedDelayMinutesPerDay} minutes of surgical capacity per day.`,
        likelyContributors: [
          'Eliminating turnover friction accelerates anesthesia induction and patient positioning.',
          `Cumulative daily recovery enables booking approximately ${sim.additionalCasesCapacityPerWeek} additional surgical procedures per week across the suite.`,
        ],
        evidence: [
          `Baseline Utilization: ${sim.baselineUtilization}%`,
          `Simulated Utilization: ${sim.simulatedUtilization}% (+${sim.utilizationGainPercentage}%)`,
          `Daily Recovered Time: ${sim.savedDelayMinutesPerDay} minutes`,
          `Weekly Additional Capacity: +${sim.additionalCasesCapacityPerWeek} cases`,
        ],
        recommendedActions: [
          'Stage standardized turnover packs outside the theatre prior to case conclusion.',
          'Deploy SmartOT real-time turnover countdown timer to coordinate environmental service dispatch.',
        ],
        uncertaintyLimitations: 'Simulated projection based on standard 10-hour surgical block scheduling model.',
        timestamp: nowIso,
      };
    }

    // =========================================================================
    // 7. GENERAL SUITE STATUS FALLBACK
    // =========================================================================
    return {
      summary: `SmartOT Operations Intelligence: Active surgical suite telemetry indicates ${context.kpis.activeSurgeries} active surgeries, ${context.kpis.readyPatients} ready inpatients, ${context.kpis.delayedCases} delayed cases, and ${context.kpis.cssdAvailability}% CSSD sterile pack availability across 4 Operating Theatres.`,
      likelyContributors: [
        `Suite utilization currently measured at ${context.kpis.otUtilization}%.`,
        `${context.activeAlerts?.length || 0} active operational alerts require attention.`,
      ],
      evidence: [
        `OT Utilization: ${context.kpis.otUtilization}%`,
        `Active Surgeries: ${context.kpis.activeSurgeries}`,
        `Ready Patients: ${context.kpis.readyPatients}`,
        `Delayed Cases: ${context.kpis.delayedCases}`,
        `High-Risk Cases: ${context.kpis.highRiskCases}`,
        `CSSD Availability: ${context.kpis.cssdAvailability}%`,
      ],
      recommendedActions: [
        'Review and resolve open critical alerts in the Command Center dashboard.',
        'Ensure pre-op readiness checklists reach 6/6 complete prior to patient transport.',
        'Perform QR verification of all instrument trays upon arrival in theatre anterooms.',
      ],
      uncertaintyLimitations: disclaimer,
      timestamp: nowIso,
    };
  }
}

export const dynamicOperationsConsultant = new DynamicOperationsConsultant();
