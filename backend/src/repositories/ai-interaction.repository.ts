import { db } from '../database/db';
import { postgresClient } from '../database/postgres';

export interface AIInteractionRecord {
  id: string;
  timestamp: string;
  actorId: string;
  query: string;
  intent: string;
  contextSnapshot: Record<string, any>;
  responseSummary: string;
  riskLevel?: string;
  rootCause?: string;
  evidence: string[];
  recommendedActions: string[];
  confidence: number;
  provider: string;
  model: string;
}

export class AIInteractionRepository {
  public async logInteraction(record: Omit<AIInteractionRecord, 'id' | 'timestamp'>): Promise<AIInteractionRecord> {
    const fullRecord: AIInteractionRecord = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };

    // Save to PostgreSQL if connected
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO ai_interactions (id, timestamp, actor_id, query, intent, context_snapshot, response_summary, risk_level, root_cause, evidence, recommended_actions, confidence, provider, model)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            fullRecord.id,
            fullRecord.timestamp,
            fullRecord.actorId,
            fullRecord.query,
            fullRecord.intent,
            JSON.stringify(fullRecord.contextSnapshot),
            fullRecord.responseSummary,
            fullRecord.riskLevel || null,
            fullRecord.rootCause || null,
            JSON.stringify(fullRecord.evidence),
            JSON.stringify(fullRecord.recommendedActions),
            fullRecord.confidence,
            fullRecord.provider,
            fullRecord.model,
          ]
        );
      } catch (err: any) {
        console.warn('[AIInteractionRepository] Failed to insert into PG:', err.message);
      }
    }

    // Also update in-memory database
    const data = db.getData() as any;
    if (!data.ai_interactions) {
      data.ai_interactions = [];
    }
    data.ai_interactions.unshift(fullRecord);
    db.persist();

    return fullRecord;
  }

  public async findAll(): Promise<AIInteractionRecord[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM ai_interactions ORDER BY timestamp DESC LIMIT 50'
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp,
          actorId: r.actor_id,
          query: r.query,
          intent: r.intent,
          contextSnapshot: typeof r.context_snapshot === 'string' ? JSON.parse(r.context_snapshot) : r.context_snapshot,
          responseSummary: r.response_summary,
          riskLevel: r.risk_level,
          rootCause: r.root_cause,
          evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence,
          recommendedActions: typeof r.recommended_actions === 'string' ? JSON.parse(r.recommended_actions) : r.recommended_actions,
          confidence: Number(r.confidence),
          provider: r.provider,
          model: r.model,
        }));
      } catch (err: any) {
        console.warn('[AIInteractionRepository] Failed to query PG:', err.message);
      }
    }

    const data = db.getData() as any;
    return (data.ai_interactions || []).slice(0, 50);
  }
}

export const aiInteractionRepository = new AIInteractionRepository();
