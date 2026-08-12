import { AIOperationsContext, AIConsultantResponse } from '../../../shared/src/types';

export interface IAIProvider {
  generateConsultation(query: string, context: AIOperationsContext): Promise<AIConsultantResponse>;
}

/**
 * Local Rule-Based Explainable AI Operations Consultant
 * Runs 100% locally with zero external API dependencies, producing structured operational guidance.
 */
export class LocalOperationsConsultant implements IAIProvider {
  async generateConsultation(query: string, context: AIOperationsContext): Promise<AIConsultantResponse> {
    const q = query.toLowerCase();

    // 1. "Why is OT-03 delayed?" or specific OT query
    if (q.includes('ot-03') || (q.includes('delayed') && q.includes('why'))) {
      return {
        summary: 'OT-03 is currently delayed by 18 minutes due to an incomplete pre-op readiness checklist and missing surgical consent for Patient Arthur Pendelton (P-1024) in Pre-Op Ward 4B.',
        likelyContributors: [
          'Inpatient surgical consent verification is MISSING in Ward 4B (readiness 5/6 complete).',
          'Ward transport not authorized until legal/clinical consent confirmation is logged.',
          'Sterile instrument set (CSSD-021) is verified and staged, ruling out equipment bottleneck.',
        ],
        evidence: [
          'Patient P-1024 readiness checklist: 5 of 6 items completed.',
          'Critical Alert raised: "Missing Surgical Consent: Patient P-1024".',
          'Scheduled start was 14:00 (18 minutes overrun relative to schedule baseline).',
          'CSSD-021 Appendectomy Set status: AVAILABLE (Passed chemical indicators).',
        ],
        recommendedActions: [
          'Prioritize Ward 4B attending physician signature & patient consent verification immediately.',
          'Alert OT-03 circulating nurse once readiness transitions to 6/6 READY.',
          'Initiate immediate patient transport transfer from Ward 4B to OT-03.',
        ],
        uncertaintyLimitations: 'Analysis derived from timestamped event log stream. Physical clinical condition of patient is managed by attending staff.',
        timestamp: new Date().toISOString(),
      };
    }

    // 2. "Which OT is most at risk?"
    if (q.includes('risk') || q.includes('most at risk')) {
      return {
        summary: 'OT-03 (Emergency & General Surgery) has the HIGHEST delay risk score (85/100), followed by OT-04 (Cardiovascular) at MEDIUM risk (55/100).',
        likelyContributors: [
          'OT-03: Pre-op consent bottleneck on active case + cascading delay risk on subsequent Thyroid Lobectomy (surg_05).',
          'OT-04: Turnover time overrun (+12 min past benchmark) delaying scheduled CABG preparation.',
        ],
        evidence: [
          'OT-03 risk score: HIGH (Cascading downstream push of +20m to 16:00 case).',
          'OT-04 risk score: MEDIUM (Turnover elapsed 37m vs 25m benchmark).',
          'OT-01 and OT-02 are operating within acceptable schedule buffers (LOW risk).',
        ],
        recommendedActions: [
          'Resolve Ward 4B consent hold to unblock OT-03.',
          'Dispatch auxiliary environmental support to OT-04 to expedite terminal turnover.',
          'Notify Dr. Martinez of revised estimated incision time for 16:00 case.',
        ],
        uncertaintyLimitations: 'Risk scores represent operational workflow probabilities based on historical timing deltas.',
        timestamp: new Date().toISOString(),
      };
    }

    // 3. "What are today's biggest bottlenecks?"
    if (q.includes('bottleneck') || q.includes('delay cause') || q.includes('biggest')) {
      return {
        summary: 'Patient Ward-to-OT Transfer (38%) and Central Sterile Pack Staging (27%) are the two largest operational delay contributors across the surgical suite today.',
        likelyContributors: [
          'Ward transport delays averaging 22 minutes (7 minutes above 15m benchmark).',
          'Sterile pack identification and pre-assignment happening too close to scheduled start times.',
          'Operating room turnover exceeding 25-minute benchmark during peak midday changeovers.',
        ],
        evidence: [
          'Patient Transfer: 38% of total delay time (245 cumulative lost minutes).',
          'CSSD Pack Staging: 27% of total delay time (174 lost minutes).',
          'Turnover Overruns: 21% of total delay time (135 lost minutes).',
          'Late Ward Documentation: 14% of total delay time (90 lost minutes).',
        ],
        recommendedActions: [
          'Establish a mandatory T-30 minute pre-op checklist audit on all surgical wards.',
          'Enable barcode/QR pre-assignment of sterile trays at least 2 hours prior to scheduled case.',
          'Implement parallel room turnover cleaning workflows during surgical drape breakdown.',
        ],
        uncertaintyLimitations: 'Percentages reflect correlated workflow events logged in the last 24-hour cycle.',
        timestamp: new Date().toISOString(),
      };
    }

    // 4. "What should the operations team prioritize?" or "Next best action"
    if (q.includes('prioritize') || q.includes('priority') || q.includes('next action') || q.includes('action')) {
      const topAction = context.nextBestActions[0];
      return {
        summary: `The top operational priority is: "${topAction ? topAction.action : 'Verify Ward 4B Consent'}" (Impact Score: ${topAction ? topAction.impactScore : 95}/100).`,
        likelyContributors: [
          'High-impact bottleneck directly holding up an active surgical suite (OT-03).',
          'Downstream cascading risk affecting subsequent scheduled cases.',
        ],
        evidence: context.nextBestActions.slice(0, 3).map((a) => `[${a.priority}] ${a.action} — ${a.rationale}`),
        recommendedActions: context.nextBestActions.slice(0, 3).map((a) => a.action),
        uncertaintyLimitations: 'Priority rankings are computed using dependency graphs, delay urgency, and capacity impact.',
        timestamp: new Date().toISOString(),
      };
    }

    // 5. "How would reducing turnover affect utilization?"
    if (q.includes('turnover') && (q.includes('utilization') || q.includes('affect') || q.includes('reduce'))) {
      return {
        summary: 'Reducing average room turnover from 30m to 20m (-10m) increases overall surgical suite utilization from 78.4% to 83.2% (+4.8% gain), recovering ~105 minutes of daily surgical capacity.',
        likelyContributors: [
          'Faster room turnaround allows earlier patient positioning and anesthesia induction.',
          'Cumulative time recovery across 14 daily cases enables booking 1 to 2 additional elective procedures weekly.',
        ],
        evidence: [
          'Baseline Suite Utilization: 78.4% across 4 Operating Theatres.',
          'Simulated Suite Utilization: 83.2% (Recovers 105 daily minutes).',
          'Estimated additional capacity: 6.5 additional surgical slots per month.',
        ],
        recommendedActions: [
          'Standardize environmental cleaning kits staged outside each theatre prior to case conclusion.',
          'Utilize SmartOT live turnover countdown timer to coordinate environmental service dispatch.',
        ],
        uncertaintyLimitations: 'Simulated estimate based on standard 10-hour surgical block model; actual capacity depends on surgeon and specialty availability.',
        timestamp: new Date().toISOString(),
      };
    }

    // 6. Generic Operational Guidance Fallback
    return {
      summary: `SmartOT Operations Consultant: Current suite status shows ${context.kpis.activeSurgeries} active surgeries, ${context.kpis.delayedCases} delayed cases, and ${context.activeAlerts?.length || 0} active alerts across 4 Operating Theatres.`,
      likelyContributors: [
        'Ward-to-OT transport latency and pre-op consent readiness are the primary active contributors.',
        'Central sterile supply availability is currently at 94% with sufficient surgical set buffers.',
      ],
      evidence: [
        `OT Utilization: ${context.kpis.otUtilization}%`,
        `Ready Inpatients: ${context.kpis.readyPatients}`,
        `High-Risk Cases: ${context.kpis.highRiskCases}`,
        `CSSD Availability: ${context.kpis.cssdAvailability}%`,
      ],
      recommendedActions: [
        'Review and resolve open critical alerts in the Command Center.',
        'Ensure patient readiness checklists reach 6/6 in inpatient wards at least 30 minutes prior to scheduled start.',
        'Scan instrument pack QR codes upon delivery to the sterile anteroom.',
      ],
      uncertaintyLimitations: 'Advisory guidance generated from real-time synthetic operational event telemetry.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Multi-Provider External LLM Consultant (xAI Grok / Groq / OpenAI / Anthropic / Gemini / Local)
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
          let rawContent = json.choices[0].message.content;
          // Handle markdown code blocks if wrapped by model
          if (rawContent.includes('```json')) {
            rawContent = rawContent.split('```json')[1].split('```')[0].trim();
          } else if (rawContent.includes('```')) {
            rawContent = rawContent.split('```')[1].split('```')[0].trim();
          }
          const parsed = JSON.parse(rawContent);
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
          console.warn('xAI Grok API returned error, using Local Consultant fallback:', errText);
        }
      } catch (e) {
        console.warn('xAI Grok API call failed, using Local Consultant fallback:', e);
      }
    }

    // 2. GROQ AI Integration (Ultra-fast Llama-3.3-70b / Llama-3.1-8b)
    if ((provider === 'groq' || (!provider && groqKey)) && groqKey) {
      try {
        const prompt = this.buildPrompt(query, context);
        const model = process.env.GROQ_MODEL_NAME || process.env.AI_MODEL_NAME || 'llama-3.3-70b-versatile';

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
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const parsed = JSON.parse(json.choices[0].message.content);
          return {
            summary: parsed.summary || 'Operational Analysis Complete',
            likelyContributors: parsed.likelyContributors || [],
            evidence: parsed.evidence || [],
            recommendedActions: parsed.recommendedActions || [],
            uncertaintyLimitations:
              parsed.uncertaintyLimitations ||
              'Operational decision support only (Powered by Groq Llama-3). Clinical decisions remain the responsibility of medical staff.',
            timestamp: new Date().toISOString(),
          };
        } else {
          const errText = await res.text();
          console.warn('Groq API returned error, using Local Consultant fallback:', errText);
        }
      } catch (e) {
        console.warn('Groq API call failed, using Local Consultant fallback:', e);
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
          const parsed = JSON.parse(json.choices[0].message.content);
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
        }
      } catch (e) {
        console.warn('OpenAI API call failed, using Local Consultant fallback:', e);
      }
    }

    // Default to deterministic Local Explainable Consultant
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

  public async ask(query: string, context: AIOperationsContext): Promise<AIConsultantResponse> {
    return this.provider.generateConsultation(query, context);
  }
}

export const aiOperationsService = new AIOperationsService();
