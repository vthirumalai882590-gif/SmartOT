import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { AIConsultantResponse } from '../../../shared/src/types';
import {
  Sparkles,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Trash2,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface AIConsultantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  queryText?: string;
  response?: AIConsultantResponse;
  timestamp: string;
}

export const AIConsultantDrawer: React.FC<AIConsultantDrawerProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading]);

  if (!isOpen) return null;

  const handleAsk = async (queryText?: string) => {
    const textToAsk = queryText || query;
    if (!textToAsk.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      queryText: textToAsk,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await api.askAIConsultant(textToAsk);
      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        response: res.consultation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      alert(`AI Query error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    'Why is OT-03 delayed?',
    'What is the current status of all 4 operating rooms?',
    'Can we move patient Eleanor Sterling to OT-02?',
    'Which OT is most at risk of cascading delay?',
    "What are today's biggest bottlenecks?",
    'What should the operations team prioritize right now?',
    'How would reducing turnover by 10m affect suite utilization?',
  ];

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden text-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 heading-serif flex items-center space-x-2">
                <span>AI Operations Consultant</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono border border-teal-200 shadow-sm font-semibold">
                  Live Telemetry
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Correlated Surgical Telemetry & Decision Support
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear Chat History"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Suggested Prompt Pills */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 heading-serif">
              Suggested Live Questions:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs text-slate-700 transition text-left shadow-sm font-medium disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {messages.length === 0 && !isLoading && (
            <div className="p-8 text-center space-y-2 text-slate-400 bg-slate-50/60 rounded-2xl border border-slate-200/60 mt-4">
              <Bot className="h-10 w-10 text-teal-600/40 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Ask any operational question regarding surgical suite status
              </p>
              <p className="text-xs text-slate-500">
                The assistant dynamically queries live telemetry, patient checklists, and sterile pack availability.
              </p>
            </div>
          )}

          {/* Conversation Thread */}
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2.5">
              {msg.sender === 'user' ? (
                <div className="flex items-start justify-end space-x-2">
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-medium shadow-sm">
                    <p>{msg.queryText}</p>
                    <span className="block text-[10px] text-teal-100 text-right mt-1">{msg.timestamp}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800 shadow-sm shrink-0">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                </div>
              ) : msg.response ? (
                <div className="flex items-start space-x-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 text-teal-400" />
                  </div>
                  <div className="flex-1 space-y-3 max-w-full">
                    {/* Summary */}
                    <div className="p-3.5 rounded-xl bg-teal-50/90 border border-teal-200 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider flex items-center space-x-1">
                          <CheckCircle className="h-3.5 w-3.5 text-teal-600" />
                          <span>Executive Summary</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 leading-relaxed">
                        {msg.response.summary}
                      </p>
                    </div>

                    {/* Likely Contributors */}
                    {msg.response.likelyContributors.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center space-x-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Contributing Factors</span>
                        </span>
                        <ul className="space-y-1 text-xs text-slate-800">
                          {msg.response.likelyContributors.map((c, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evidence */}
                    {msg.response.evidence.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-cyan-600" />
                          <span>Correlated Telemetry</span>
                        </span>
                        <div className="space-y-1 text-[11px] font-mono text-slate-700">
                          {msg.response.evidence.map((e, i) => (
                            <div key={i} className="p-1 rounded bg-white border border-slate-200/80">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {msg.response.recommendedActions.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1.5 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center space-x-1">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Recommended Actions</span>
                        </span>
                        <div className="space-y-1.5 text-xs text-emerald-950">
                          {msg.response.recommendedActions.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center space-x-1.5 p-2 rounded-lg bg-white border border-emerald-200 shadow-sm"
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-1.5 text-[10px] text-slate-500">
                      <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{msg.response.uncertaintyLimitations}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-2">
              <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm shrink-0">
                <Bot className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-2 flex-1">
                <div className="flex items-center space-x-2 text-teal-700 font-semibold text-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-teal-600" />
                  <span>Analyzing telemetry & evaluating operations...</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
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
              placeholder="Ask any operations question (e.g. Can we start OT-01 early?)..."
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
