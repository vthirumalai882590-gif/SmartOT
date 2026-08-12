import React, { useState } from 'react';
import { api } from '../services/api';
import { AIConsultantResponse } from '../../../shared/src/types';
import {
  Sparkles,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface AIConsultantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIConsultantDrawer: React.FC<AIConsultantDrawerProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIConsultantResponse | null>(null);

  if (!isOpen) return null;

  const handleAsk = async (queryText?: string) => {
    const textToAsk = queryText || query;
    if (!textToAsk.trim()) return;

    setIsLoading(true);
    setQuery(textToAsk);
    try {
      const res = await api.askAIConsultant(textToAsk);
      setResponse(res.consultation);
    } catch (err: any) {
      alert(`AI Query error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    'Why is OT-03 delayed?',
    'Which OT is most at risk of cascading delay?',
    "What are today's biggest bottlenecks?",
    'What should the operations team prioritize right now?',
    'How would reducing turnover by 10m affect suite utilization?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 heading-serif flex items-center space-x-2">
                <span>AI Operations Consultant</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono border border-teal-200 shadow-sm">
                  Advisory Mode
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Correlated Hospital Telemetry & Explainable Decision Support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Suggested Prompt Pills */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 heading-serif">
              Suggested Operations Queries:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs text-slate-700 transition text-left shadow-sm font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* AI Response Display */}
          {isLoading ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3 shadow-inner">
              <Sparkles className="h-8 w-8 text-teal-600 mx-auto animate-spin" />
              <p className="text-xs font-semibold text-slate-700">
                Correlating workflow events, readiness timelines & delay factors...
              </p>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* SUMMARY CARD */}
              <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-2 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5 text-teal-600" />
                  <span>Executive Operational Summary</span>
                </span>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">{response.summary}</p>
              </div>

              {/* LIKELY CONTRIBUTORS */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center space-x-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Likely Contributing Factors</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-800">
                  {response.likelyContributors.map((c, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* EVIDENCE & TIMINGS */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Correlated Workflow Evidence</span>
                </span>
                <div className="space-y-1 text-xs font-mono text-slate-700">
                  {response.evidence.map((e, i) => (
                    <div key={i} className="p-1.5 rounded bg-white border border-slate-200/80">
                      {e}
                    </div>
                  ))}
                </div>
              </div>

              {/* RECOMMENDED OPERATIONAL ACTIONS */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center space-x-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Recommended Operational Actions</span>
                </span>
                <div className="space-y-2 text-xs text-emerald-900">
                  {response.recommendedActions.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-emerald-200/80 shadow-sm"
                    >
                      <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SAFETY BOUNDARY DISCLAIMER */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2 text-[11px] text-slate-500">
                <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{response.uncertaintyLimitations}</span>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center space-y-2 text-slate-400">
              <Sparkles className="h-10 w-10 text-teal-600/40 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Ask any operational question regarding surgical suite status
              </p>
              <p className="text-xs text-slate-500">
                The assistant analyzes real-time events, readiness checklists, and instrument availability.
              </p>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
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
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
