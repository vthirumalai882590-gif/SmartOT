import { AIOperationsContext, AIConsultantResponse } from '../../../shared/src/types';
import { dynamicOperationsConsultant } from './dynamic-consultant';
import { aiIntentExtractor } from './ai-intent';
import { aiInteractionRepository } from '../repositories/ai-interaction.repository';

export interface IAIProvider {
  generateConsultation(query: string, context: AIOperationsContext): Promise<AIConsultantResponse>;
}

function extractJSON(raw: string): any {
  let content = raw.trim();
  if (content.includes('</think>')) {
    content = content.split('</think>')[1].trim();
  }
  if (content.includes('```json')) {
    content = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    content = content.split('```')[1].split('```')[0].trim();
  }
  try {
    return JSON.parse(content);
  } catch {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(content.substring(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse JSON from model output');
  }
}

/**
 * Local Explainable Dynamic AI Operations Consultant
 * Runs 100% locally with zero external API dependencies, reading live database facts dynamically.
 */
export class LocalOperationsConsultant implements IAIProvider {
  async generateConsultation(query: string, context: AIOperationsContext): Promise<AIConsultantResponse> {
    return dynamicOperationsConsultant.generateConsultation(query, context);
  }
}

/**
 * Multi-Provider External LLM Consultant (xAI Grok / Groq / OpenAI / Anthropic / Gemini / Dynamic Local)
 */
export class ExternalLLMConsultant implements IAIProvider {
  private fallback = new LocalOperationsConsultant();

  async generateConsultation(query: string, context: AIOperationsContext): Promise<AIConsultantResponse> {
    const provider = (process.env.AI_PROVIDER || 'local').toLowerCase();
    const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. xAI GROK Integration (grok-2-latest / grok-beta)
    if ((provider === 'grok' || provider === 'xai' || (!provider && grokKey)) && grokKey) {
      try {
        const prompt = this.buildPrompt(query, context);
        const model = process.env.GROK_MODEL_NAME || process.env.AI_MODEL_NAME || 'grok-2-latest';

        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${grokKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are SmartOT Command AI Operations Consultant. You provide OPERATIONAL workflow guidance to hospital staff based on real-time surgical suite telemetry. You must NEVER make clinical diagnoses or medical treatment recommendations. Always respond strictly in valid JSON format matching: { "summary": "...", "likelyContributors": ["..."], "evidence": ["..."], "recommendedActions": ["..."], "uncertaintyLimitations": "..." }',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const parsed = extractJSON(json.choices[0].message.content);
          return {
            summary: parsed.summary || 'Operational Analysis Complete',
            likelyContributors: parsed.likelyContributors || [],
            evidence: parsed.evidence || [],
            recommendedActions: parsed.recommendedActions || [],
            uncertaintyLimitations:
              parsed.uncertaintyLimitations ||
              'Operational decision support only (Powered by xAI Grok). Clinical decisions remain the sole responsibility of licensed medical staff.',
            timestamp: new Date().toISOString(),
          };
        } else {
          const errText = await res.text();
          console.warn('xAI Grok API returned error, using fallback:', errText);
        }
      } catch (e) {
        console.warn('xAI Grok API call failed, using fallback:', e);
      }
    }

    // 2. GROQ AI Integration (Multi-model auto-discovery and retry)
    if ((provider === 'groq' || (!provider && groqKey)) && groqKey) {
      const candidateModels = [
        process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-120b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'groq/compound',
        'qwen/qwen3.6-27b',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
      ];

      for (const model of candidateModels) {
        try {
          const prompt = this.buildPrompt(query, context);
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are SmartOT Command AI Operations Consultant. You provide OPERATIONAL workflow guidance to hospital staff based on real-time surgical suite telemetry. You must NEVER make clinical diagnoses or medical treatment recommendations. Always respond strictly in valid JSON format matching: { "summary": "...", "likelyContributors": ["..."], "evidence": ["..."], "recommendedActions": ["..."], "uncertaintyLimitations": "..." }',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.1,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const rawContent = json.choices[0].message.content;
            const parsed = extractJSON(rawContent);
            return {
              summary: parsed.summary || 'Operational Analysis Complete',
              likelyContributors: parsed.likelyContributors || [],
              evidence: parsed.evidence || [],
              recommendedActions: parsed.recommendedActions || [],
              uncertaintyLimitations:
                parsed.uncertaintyLimitations ||
                `Operational decision support only (Powered by Groq ${model}). Clinical decisions remain the responsibility of medical staff.`,
              timestamp: new Date().toISOString(),
            };
          } else {
            const errText = await res.text();
            console.warn(`Groq API model ${model} returned error, trying next candidate:`, errText);
          }
        } catch (e: any) {
          console.warn(`Groq API model ${model} failed, trying next candidate:`, e.message);
        }
      }
    }

    // 3. OpenAI Integration
    if (provider === 'openai' && openaiKey) {
      try {
        const prompt = this.buildPrompt(query, context);
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL_NAME || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are SmartOT Command AI Operations Consultant. Provide operational workflow guidance in JSON format: { "summary": "...", "likelyContributors": [], "evidence": [], "recommendedActions": [], "uncertaintyLimitations": "..." }',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const parsed = extractJSON(json.choices[0].message.content);
          return {
            summary: parsed.summary || 'Operational Analysis Complete',
            likelyContributors: parsed.likelyContributors || [],
            evidence: parsed.evidence || [],
            recommendedActions: parsed.recommendedActions || [],
            uncertaintyLimitations:
              parsed.uncertaintyLimitations ||
              'Operational decision support only. Clinical decisions remain the sole responsibility of licensed medical practitioners.',
            timestamp: new Date().toISOString(),
          };
        } else {
          console.warn('OpenAI API call returned error, using dynamic Local Consultant fallback');
        }
      } catch (e) {
        console.warn('OpenAI API call failed, using dynamic Local Consultant fallback:', e);
      }
    }

    // Default to dynamic deterministic Local Explainable Consultant
    return this.fallback.generateConsultation(query, context);
  }

  private buildPrompt(query: string, context: AIOperationsContext): string {
    return `Hospital Surgical Suite Telemetry Context:
- Active KPIs: OT Utilization: ${context.kpis.otUtilization}%, Active Surgeries: ${context.kpis.activeSurgeries}, Ready Patients: ${context.kpis.readyPatients}, Delayed Cases: ${context.kpis.delayedCases}, High-Risk Cases: ${context.kpis.highRiskCases}, CSSD Availability: ${context.kpis.cssdAvailability}%
- Operating Theatres Status: ${JSON.stringify(context.otStatuses)}
- Active Operational Alerts: ${JSON.stringify(context.activeAlerts)}
- Top Bottlenecks: ${JSON.stringify(context.bottlenecks)}
- Next Best Actions: ${JSON.stringify(context.nextBestActions)}
- Recent Event Stream: ${JSON.stringify(context.recentEvents)}

User Operations Question: "${query}"

Provide your structured operational analysis JSON following:
{
  "summary": "...",
  "likelyContributors": ["..."],
  "evidence": ["..."],
  "recommendedActions": ["..."],
  "uncertaintyLimitations": "..."
}`;
  }
}

export class AIOperationsService {
  private provider: IAIProvider;

  constructor() {
    this.provider = new ExternalLLMConsultant();
  }

  public async ask(
    query: string,
    context: AIOperationsContext,
    actorId: string = 'system'
  ): Promise<AIConsultantResponse> {
    const response = await this.provider.generateConsultation(query, context);
    const parsedIntent = aiIntentExtractor.parse(query);

    // Asynchronously log AI consultation for governance and auditability
    try {
      await aiInteractionRepository.logInteraction({
        actorId,
        query,
        intent: parsedIntent.intent,
        contextSnapshot: {
          kpis: context.kpis,
          activeAlertCount: context.activeAlerts?.length || 0,
        },
        responseSummary: response.summary,
        riskLevel: response.summary.includes('HIGH') ? 'HIGH' : response.summary.includes('MEDIUM') ? 'MEDIUM' : 'LOW',
        evidence: response.evidence,
        recommendedActions: response.recommendedActions,
        confidence: 0.95,
        provider: process.env.AI_PROVIDER || 'groq',
        model: process.env.GROQ_MODEL_NAME || 'openai/gpt-oss-120b',
      });
    } catch (e: any) {
      console.warn('Failed to log AI interaction:', e.message);
    }

    return response;
  }
}

export const aiOperationsService = new AIOperationsService();
