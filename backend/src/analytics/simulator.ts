import { SimulationParameters, SimulationResult } from '../../../shared/src/types';

export class WhatIfSimulator {
  public runSimulation(params: SimulationParameters): SimulationResult {
    const baselineUtilization = 78.4; // Base average OT utilization %
    const totalOTDailyCapacityMinutes = 4 * 10 * 60; // 4 OTs running 10-hour surgical blocks = 2400 minutes

    // Estimated daily cases across 4 OTs
    const averageDailyCases = 14;

    // 1. Turnover impact: every minute saved on turnover across 14 cases saves minutes directly
    const turnoverSavedDailyMinutes = params.turnoverReductionMinutes * (averageDailyCases * 0.75);

    // 2. Transfer impact: every minute saved on ward transport prevents idle waiting
    const transferSavedDailyMinutes = params.transferOptimizationMinutes * (averageDailyCases * 0.85);

    // 3. Early Readiness buffer: avoids last-minute consent hold delays
    const readinessSavedDailyMinutes = Math.min(params.prepChecklistAutomationHours * 15, 45);

    const totalSavedMinutes = Math.round(
      turnoverSavedDailyMinutes + transferSavedDailyMinutes + readinessSavedDailyMinutes
    );

    // Calculate simulated utilization gain
    const utilizationGain = Number(((totalSavedMinutes / totalOTDailyCapacityMinutes) * 100).toFixed(1));
    const simulatedUtilization = Math.min(96.5, Number((baselineUtilization + utilizationGain).toFixed(1)));

    // Estimate additional surgical case capacity (assuming avg 80 min case duration)
    const avgSurgeryDuration = 80;
    const additionalWeeklyCases = Math.round((totalSavedMinutes * 5) / avgSurgeryDuration);

    return {
      baselineUtilization,
      simulatedUtilization,
      utilizationGainPercentage: utilizationGain,
      savedDelayMinutesPerDay: totalSavedMinutes,
      additionalCasesCapacityPerWeek: additionalWeeklyCases,
      explanation: `SIMULATION / ESTIMATE: Reducing turnover by ${params.turnoverReductionMinutes}m and transfer time by ${params.transferOptimizationMinutes}m recovers approx. ${totalSavedMinutes} minutes of cumulative OT time per day, supporting up to ${additionalWeeklyCases} additional surgical procedures per week. (Operational estimate based on synthetic workflow benchmarks; not a clinical guarantee).`,
      breakdown: {
        turnoverImpactMinutes: Math.round(turnoverSavedDailyMinutes),
        transferImpactMinutes: Math.round(transferSavedDailyMinutes),
        readinessImpactMinutes: Math.round(readinessSavedDailyMinutes),
      },
    };
  }
}

export const whatIfSimulator = new WhatIfSimulator();
