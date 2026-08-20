import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/database/seed';
import { aiOperationsService } from '../src/ai/ai-provider';
import { aiContextBuilder } from '../src/ai/ai-context';
import { otRepository } from '../src/repositories/ot.repository';
import { patientRepository } from '../src/repositories/patient.repository';

describe('Dynamic Live AI Operations Consultant (No Hardcoding)', () => {
  beforeAll(async () => {
    await seedDatabase(true);
  });

  it('dynamically analyzes OT-03 delay using live database facts', async () => {
    const context = aiContextBuilder.buildContext();
    const res = await aiOperationsService.ask('Why is OT-03 delayed?', context, 'usr_admin');

    expect(res.summary).toContain('OT-03');
    expect(res.likelyContributors.length).toBeGreaterThan(0);
    expect(res.evidence.some((e) => e.includes('OT-03'))).toBe(true);
    expect(res.recommendedActions.length).toBeGreaterThan(0);
    expect(res.uncertaintyLimitations).toContain('Operational decision support only');
  });

  it('dynamically adapts when OT-03 status is updated to AVAILABLE', async () => {
    // Transition OT-03 to AVAILABLE (clear delays)
    otRepository.updateOTStatus('ot_03', 'AVAILABLE', { delayMinutes: 0, riskLevel: 'LOW' }, true);

    const context = aiContextBuilder.buildContext();
    const res = await aiOperationsService.ask('Status of OT-03', context, 'usr_admin');

    expect(res.summary).toContain('AVAILABLE');
    expect(res.summary).toContain('LOW');
  });

  it('dynamically analyzes patient-specific queries for Arthur Pendelton (P-1024)', async () => {
    const context = aiContextBuilder.buildContext();
    const res = await aiOperationsService.ask('What is the status of Patient P-1024?', context, 'usr_admin');

    expect(res.summary).toContain('Arthur Pendelton');
    expect(res.evidence.some((e) => e.includes('P-1024'))).toBe(true);
  });

  it('returns explicit insufficient data response when queried about non-existent entity', async () => {
    const context = aiContextBuilder.buildContext();
    const res = await aiOperationsService.ask('Why is OT-99 delayed?', context, 'usr_admin');

    expect(res.summary).toContain('Insufficient operational data');
  });

  it('dynamically calculates what-if turnover impact with concrete formulas', async () => {
    const context = aiContextBuilder.buildContext();
    const res = await aiOperationsService.ask('How would reducing turnover affect utilization?', context, 'usr_admin');

    expect(res.summary).toContain('utilization');
    expect(res.evidence.some((e) => e.includes('Baseline Utilization'))).toBe(true);
    expect(res.evidence.some((e) => e.includes('Simulated Utilization'))).toBe(true);
  });
});
