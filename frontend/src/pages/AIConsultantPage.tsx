import React, { useState } from 'react';
import { api } from '../services/api';
import { AIConsultantResponse } from '../../../shared/src/types';
import {
  Sparkles,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AIConsultantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIConsultantResponse | null>(null);

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setQuery(q);
    try {
      const res = await api.askAIConsultant(q);
      setResponse(res.consultation);
    } catch (err: any) {
      alert(`Query failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'Why is OT-03 delayed?',
    'Which OT is most at risk of cascading delay?',
    "What are today's biggest bottlenecks?",
    'What should the operations team prioritize right now?',
    'How would reducing turnover affect utilization?',
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto text-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 heading-serif flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-teal-600" />
          <span>AI Operations Consultant Console</span>
        </h1>
        <p className="text-xs text-slate-500">
          Advisory AI Assistant for surgical workflow investigations, bottleneck analysis, and operational decision support
        </p>
      </div>

      {/* Input Box & Suggested Queries */}
      <div className="p-5 glass-card space-y-4 shadow-sm border border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask operations question (e.g. Why is OT-03 delayed?)..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50 shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>Consult</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase heading-serif">Quick Questions:</span>
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleAsk(q)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs text-slate-700 transition shadow-sm font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Response Area */}
      {isLoading ? (
        <div className="p-12 glass-card text-center space-y-3 shadow-sm border border-slate-200">
          <Sparkles className="h-8 w-8 text-teal-600 mx-auto animate-spin" />
          <p className="text-sm font-semibold text-slate-700">
            Querying live telemetry & correlating workflow events...
          </p>
        </div>
      ) : response ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 space-y-2 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-teal-600" />
              <span>Summary Assessment</span>
            </span>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">{response.summary}</p>
          </div>

          {/* Contributors & Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 glass-card space-y-2 shadow-sm border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center space-x-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Likely Contributors</span>
              </span>
              <ul className="space-y-2 text-xs text-slate-800">
                {response.likelyContributors.map((c, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 glass-card space-y-2 shadow-sm border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider flex items-center space-x-1.5">
                <Clock className="h-4 w-4 text-cyan-600" />
                <span>Correlated Evidence</span>
              </span>
              <div className="space-y-1.5 text-xs font-mono text-slate-700">
                {response.evidence.map((e, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {e}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Operational Actions */}
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center space-x-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span>Recommended Operational Actions</span>
            </span>
            <div className="space-y-2">
              {response.recommendedActions.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-950 font-bold shadow-sm"
                >
                  <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
            <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{response.uncertaintyLimitations}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
