import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { aiContextBuilder } from '../src/ai/ai-context';
import { aiOperationsService } from '../src/ai/ai-provider';
import { seedDatabase } from '../src/database/seed';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Live Groq AI Provider Verification', () => {
  beforeAll(async () => {
    await seedDatabase(false);
  });

  it('connects to Groq Llama-3 and returns structured operational analysis', async () => {
    const context = aiContextBuilder.buildContext();
    const query = 'Why is OT-03 delayed and what should the charge nurse prioritize?';

    console.log('Sending query to Groq AI Llama-3.3-70b...');
    const res = await aiOperationsService.ask(query, context);

    console.log('\n--- Groq AI Response Received ---');
    console.log('Summary:', res.summary);
    console.log('Likely Contributors:', res.likelyContributors);
    console.log('Evidence:', res.evidence);
    console.log('Recommended Actions:', res.recommendedActions);
    console.log('Uncertainty:', res.uncertaintyLimitations);

    expect(res.summary).toBeDefined();
    expect(res.likelyContributors.length).toBeGreaterThan(0);
    expect(res.recommendedActions.length).toBeGreaterThan(0);
  }, 20000);
});
