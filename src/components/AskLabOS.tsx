/**
 * AskLabOS — floating chat widget.
 * Always visible in the bottom-right corner. Sends the user's full workspace
 * data as context so the AI can answer questions about their actual research.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ChevronDown, RotateCcw } from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { Markdown } from './Markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'What experiments do I have in progress?',
  'Summarize my recent notes',
  'What tasks are due soon?',
  'What papers have I saved?',
];

export function AskLabOS() {
  const { profile, experiments, observations, papers, todos } = useLab();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const buildContext = useCallback(() => ({
    researcher: {
      name: profile?.user || profile?.name,
      role: profile?.role,
      institution: profile?.institution,
      focus: profile?.focus,
    },
    experiments: experiments.slice(0, 10).map((e) => ({
      name: e.name,
      type: e.type,
      status: e.status,
      date: e.date,
      conditions: e.conditions,
      notes: e.notes ? e.notes.slice(0, 400) : undefined,
    })),
    recentNotes: observations.slice(0, 15).map((o) => ({
      text: o.text.slice(0, 250),
      date: o.createdAt,
      source: o.source,
    })),
    savedPapers: papers.slice(0, 10).map((p) => ({
      title: p.title,
      authors: p.authors,
      journal: p.journal,
      year: p.year,
    })),
    activeTasks: todos
      .filter((t) => !t.done)
      .slice(0, 12)
      .map((t) => ({ text: t.text, dueDate: t.dueDate, priority: t.priority })),
    completedTasks: todos.filter((t) => t.done).length,
  }), [profile, experiments, observations, papers, todos]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await api.chat(newMessages, buildContext());
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong — check your connection and try again.';
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 flex flex-col items-end gap-2">

      {/* ── Chat panel ── */}
      {open && (
        <div className="w-[340px] lg:w-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
          style={{ maxHeight: 'min(520px, calc(100dvh - 160px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">Ask LabOS</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Knows your workspace</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clear chat"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Minimise"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 px-2">
                  Ask anything about your research — I can see your experiments, notes, tasks, and papers.
                </p>
                <div className="flex flex-col gap-1.5 items-start px-1">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline text-left px-2 py-0.5"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-sm whitespace-pre-wrap'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm',
                  )}>
                    {m.role === 'assistant'
                      ? <Markdown className="text-sm text-slate-800 dark:text-slate-200">{m.content}</Markdown>
                      : m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2 bg-white dark:bg-slate-900">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about your research…"
              className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rotate-0'
            : 'bg-brand-500 hover:bg-brand-600 text-white hover:scale-105',
        )}
        title={open ? 'Close chat' : 'Ask LabOS'}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
}
