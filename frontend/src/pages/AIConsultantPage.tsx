import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  queryText?: string;
  response?: AIConsultantResponse;
  timestamp: string;
}

export const AIConsultantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || query;
    if (!q.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      queryText: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await api.askAIConsultant(q);
      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        response: res.consultation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      alert(`Query failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'Why is OT-03 delayed?',
    'What is the current status of all 4 operating rooms?',
    'Can we move patient Eleanor Sterling to OT-02?',
    'Which OT is most at risk of cascading delay?',
    "What are today's biggest bottlenecks?",
    'What should the operations team prioritize right now?',
    'How would reducing turnover affect utilization?',
  ];

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto text-slate-800 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 heading-serif flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-teal-600" />
            <span>AI Operations Consultant Console</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time live telemetry reasoning, surgical schedule investigation, and operational decision support
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center space-x-1.5 transition shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-4 glass-card shadow-sm border border-slate-200 space-y-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase heading-serif">
          Ask Live Telemetry Questions:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleAsk(q)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs text-slate-700 transition shadow-sm font-medium disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="p-12 text-center space-y-3 glass-card border border-slate-200 shadow-sm rounded-2xl">
            <Bot className="h-12 w-12 text-teal-600/40 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Interactive Hospital Operations Assistant
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Ask any operational question in plain English. The AI dynamically inspects live operating theatres, patient readiness checklists, CSSD sterile pack inventory, and schedule bottlenecks in real time.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.sender === 'user' ? (
              <div className="flex items-start justify-end space-x-2">
                <div className="max-w-2xl px-4 py-3 rounded-2xl bg-teal-600 text-white text-xs font-medium shadow-sm">
                  <p>{msg.queryText}</p>
                  <span className="block text-[10px] text-teal-100 text-right mt-1">{msg.timestamp}</span>
                </div>
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800 shadow-sm shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
              </div>
            ) : msg.response ? (
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-slate-900 text-white shadow-sm shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-teal-400" />
                </div>
                <div className="flex-1 space-y-4 max-w-4xl">
                  {/* Summary Assessment */}
                  <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider flex items-center space-x-1.5">
                        <CheckCircle className="h-4 w-4 text-teal-600" />
                        <span>Executive Operational Summary</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {msg.response.summary}
                    </p>
                  </div>

                  {/* Contributors & Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 glass-card space-y-2 shadow-sm border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center space-x-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>Likely Contributing Factors</span>
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-800">
                        {msg.response.likelyContributors.map((c, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 glass-card space-y-2 shadow-sm border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider flex items-center space-x-1.5">
                        <Clock className="h-4 w-4 text-cyan-600" />
                        <span>Correlated Evidence Telemetry</span>
                      </span>
                      <div className="space-y-1 text-xs font-mono text-slate-700">
                        {msg.response.evidence.map((e, i) => (
                          <div key={i} className="p-1.5 rounded bg-slate-50 border border-slate-200">
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  {msg.response.recommendedActions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5 shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center space-x-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span>Recommended Operational Actions</span>
                      </span>
                      <div className="space-y-1.5">
                        {msg.response.recommendedActions.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-950 font-bold shadow-sm"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Boundary Disclaimer */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
                    <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{msg.response.uncertaintyLimitations}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-sm shrink-0">
              <Bot className="h-4 w-4 text-teal-400 animate-pulse" />
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-2 flex-1 max-w-xl">
              <div className="flex items-center space-x-2 text-teal-700 font-semibold text-xs">
                <Sparkles className="h-4 w-4 animate-spin text-teal-600" />
                <span>Correlating live surgical telemetry & generating operational advice...</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full animate-pulse w-3/4"></div>
              <div className="h-2 bg-slate-200 rounded-full animate-pulse w-1/2"></div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="sticky bottom-4 p-3 glass-card shadow-lg border border-slate-200 rounded-2xl">
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
            placeholder="Type your operations question in plain English (e.g. What is happening in OT-01?)..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50 shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
