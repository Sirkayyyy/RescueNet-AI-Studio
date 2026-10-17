import React, { useState } from 'react';
import API from '../services/api.js';
import { Bot, Send, ShieldAlert, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { IncidentPriority } from '../types.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  priority?: IncidentPriority | 'INFO';
  category?: string;
  source?: string;
}

const SAMPLE_PROMPTS = [
  'Someone is choking and cannot speak or cough',
  'Severe bleeding from deep arm cut with glass',
  'Generator fumes and smoke inhalation in enclosed room',
  'Flash flood trapped vehicle on expressway',
  'Elderly person sudden facial drooping and slurred speech',
  'Gas cylinder leak odor in kitchen'
];

export default function AiAssistantPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'I am the RescueNet AI Emergency Triage Assistant. Describe any dangerous condition, injury, symptom, or hazard. I will provide immediate priority classification and basic safety guidance while emergency dispatch responds.',
      priority: 'INFO',
      source: 'RescueNet Core'
    }
  ]);

  const handleSendQuery = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    setQuery('');
    setHistory((prev) => [...prev, { role: 'user', content: userPrompt }]);
    setLoading(true);

    try {
      const { data } = await API.post('/ai/triage', { query: userPrompt });
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.guidance,
          summary: data.summary,
          priority: data.priority,
          category: data.category,
          source: data.source
        }
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Triage safety fail-safe: In any critical emergency, immediately dial 911 or activate the SOS button.',
          priority: 'CRITICAL',
          source: 'Deterministic Fail-Safe'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendQuery(query);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-400" />
          AI Emergency Triage Assistant
        </h1>
        <p className="text-xs text-slate-400">
          Instant threat triage, priority scoring, and step-by-step procedural safety advice.
        </p>
      </div>

      <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-200 text-xs flex items-center gap-2.5">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
        <span>
          <strong>PROCEDURAL DISCLAIMER:</strong> This AI assistant provides urgent procedural safety guidelines. It does not substitute professional emergency medical personnel, police, or firefighters.
        </span>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">Try scenario:</span>
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendQuery(prompt)}
            disabled={loading}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg whitespace-nowrap text-[11px] transition cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 min-h-[440px] max-h-[540px] overflow-y-auto space-y-4 shadow-xl">
        {history.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white rounded-br-none shadow-md shadow-red-950/30'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none space-y-2'
              }`}
            >
              {msg.role === 'assistant' && msg.priority && msg.priority !== 'INFO' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 gap-2">
                  <span className="font-black uppercase text-[10px] tracking-wider text-purple-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    {msg.category || 'EMERGENCY'} — {msg.priority} PRIORITY
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {msg.source}
                  </span>
                </div>
              )}

              {msg.summary && (
                <p className="font-bold text-slate-100 text-xs sm:text-sm">{msg.summary}</p>
              )}

              <p className="leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-purple-400 flex items-center gap-2 italic">
            <Sparkles className="w-4 h-4 animate-spin" />
            AI evaluating emergency guidance and threat vectors...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Someone is choking, conscious but unable to breathe..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-2xl font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer shadow-lg shadow-purple-950/40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
