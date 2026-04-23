import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, Trash2, Edit2, Check, X, Loader2, Sparkles, ChevronDown, ChevronUp,
  CheckSquare, Search,
} from 'lucide-react';
import { VoiceButton } from '@/src/components/VoiceButton';
import { useLab, XP } from '@/src/lib/context';
import { api, type NotebookSummary } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

// ─── Smart note action parser (client-side, no API call) ─────────────────────

type NoteAction =
  | { type: 'task'; text: string }
  | { type: 'paper'; query: string };

function analyzeNoteForActions(text: string): NoteAction[] {
  const actions: NoteAction[] = [];
  const seen = new Set<string>();

  const add = (a: NoteAction) => {
    const key = a.type + ':' + (a.type === 'task' ? a.text : a.query);
    if (!seen.has(key)) { seen.add(key); actions.push(a); }
  };

  // Split into individual sentences, handling multiple delimiters
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 300);

  const TASK_TRIGGERS = [
    /\b(need to|needs to|must|should|have to|has to|don't forget|remember to|plan to|going to|will)\b/i,
    /\bask\s+(pi|supervisor|advisor|dr\.?|professor|my|the)\b/i,
    /\bby\s+(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|end\s+of\s+(the\s+)?week|eow)\b/i,
    /\b(todo|to-do|action item|follow[- ]?up)\b/i,
    /\bschedule\s+(a|the|meeting|session|call)\b/i,
    /\b(submit|send|email|message|review|check|verify|confirm|update)\b/i,
  ];

  for (const sentence of sentences) {
    if (TASK_TRIGGERS.some((p) => p.test(sentence))) {
      let task = sentence.replace(/^[-•*]\s*/, '').trim();
      task = task.charAt(0).toUpperCase() + task.slice(1);
      if (task.length >= 10) add({ type: 'task', text: task });
    }
  }

  // "Author et al. YYYY" → suggest PubMed search
  const etAl = /([A-Z][a-z]+(?:\s*(?:and|&|,)\s*[A-Z][a-z]+)?)\s+et\s+al\.?\s*[\(\[]?(\d{4})[\)\]]?/g;
  let m: RegExpExecArray | null;
  while ((m = etAl.exec(text)) !== null) {
    add({ type: 'paper', query: `${m[1]} ${m[2]}` });
  }

  // "read / find the X paper/study/review"
  const paperPhrase = /(?:read|look\s+up|find|check\s+out|search\s+for)\s+(?:the\s+)?["']?([^"'.!?\n]{5,60}?)["']?\s+(?:paper|study|article|review)\b/gi;
  while ((m = paperPhrase.exec(text)) !== null) {
    add({ type: 'paper', query: m[1].trim() });
  }

  return actions.slice(0, 4);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatDuration(sec?: number) {
  if (!sec) return '';
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Inline action suggestions (shown right below the note input) ─────────────

function NoteActionSuggestions({ actions, onAddTask, onSearchPaper, onDismiss }: {
  actions: NoteAction[];
  onAddTask: (text: string, index: number) => void;
  onSearchPaper: (query: string) => void;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 20 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 20000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (actions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-brand-200 dark:border-brand-700 rounded-2xl p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          Suggested from your note
        </p>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-700/60 rounded-xl">
            {action.type === 'task' ? (
              <>
                <CheckSquare className="w-4 h-4 text-learn-500 shrink-0 mt-0.5" />
                <p className="flex-1 text-xs text-slate-700 dark:text-slate-200 leading-snug min-w-0">{action.text}</p>
                <button
                  onClick={() => onAddTask(action.text, i)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-learn-500 hover:bg-learn-600 text-white font-semibold transition-colors"
                >
                  Add task
                </button>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">PubMed search</p>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug font-medium truncate">{action.query}</p>
                </div>
                <button
                  onClick={() => onSearchPaper(action.query)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors"
                >
                  Search
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function NotebookPage() {
  const navigate = useNavigate();
  const { observations, profile, addObservation, updateObservation, removeObservation, addTodo, awardXP } = useLab();
  const [manualText, setManualText] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [summary, setSummary] = useState<NotebookSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [expandedSummary, setExpandedSummary] = useState(true);
  // Per-entry bullet summaries: { [obsId]: string[] | 'loading' | 'error' }
  const [entryBullets, setEntryBullets] = useState<Record<string, string[] | 'loading' | 'error'>>({});
  // Smart action suggestions (shown inline below the input)
  const [pendingActions, setPendingActions] = useState<NoteAction[]>([]);

  const todayIso = new Date().toDateString();
  const todayCount = observations.filter(
    (o) => new Date(o.createdAt).toDateString() === todayIso,
  ).length;

  const triggerActionAnalysis = (text: string) => {
    const actions = analyzeNoteForActions(text);
    if (actions.length > 0) setPendingActions(actions);
  };

  const handleTranscribed = async (text: string, meta: { durationSec: number }) => {
    if (!text.trim()) return;
    await addObservation({ text: text.trim(), source: 'voice', durationSec: meta.durationSec });
    awardXP(XP.NOTE_ENTRY);
    triggerActionAnalysis(text);
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSavingManual(true);
    const saved = manualText.trim();
    try {
      await addObservation({ text: saved, source: 'typed' });
      setManualText('');
      awardXP(XP.NOTE_ENTRY);
      triggerActionAnalysis(saved);
    } finally {
      setSavingManual(false);
    }
  };

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const saveEdit = async () => {
    if (editingId) await updateObservation(editingId, { text: editText.trim() });
    setEditingId(null);
    setEditText('');
  };

  // Per-entry AI bullet summary — uses the dedicated fast endpoint
  const runEntryBullets = async (obsId: string, text: string) => {
    if (Array.isArray(entryBullets[obsId])) {
      setEntryBullets((m) => { const n = { ...m }; delete n[obsId]; return n; });
      return;
    }
    setEntryBullets((m) => ({ ...m, [obsId]: 'loading' }));
    try {
      const { bullets } = await api.bulletSummary(text);
      setEntryBullets((m) => ({ ...m, [obsId]: bullets.length ? bullets : ['(No summary generated.)'] }));
    } catch {
      setEntryBullets((m) => ({ ...m, [obsId]: 'error' }));
    }
  };

  const runSummary = async () => {
    setSummarizing(true);
    setSummaryError('');
    try {
      const recent = observations.slice(0, 20).slice().reverse();
      const result = await api.summarizeNotebook(recent, profile?.focus);
      setSummary(result);
      setExpandedSummary(true);
    } catch (err: any) {
      setSummaryError(err?.message || 'Could not summarize the notebook.');
    } finally {
      setSummarizing(false);
    }
  };

  // Popup action handlers
  const handleAddTask = (text: string, index: number) => {
    addTodo({ text, priority: 'normal' });
    setPendingActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearchPaper = (query: string) => {
    setPendingActions([]);
    navigate('/library', { state: { query } });
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-slide-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">My Notes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {observations.length} total · <span className="text-sky-600 font-medium">{todayCount} today</span>
            {todayCount > 0 && <span className="ml-1">🌟</span>}
          </p>
        </div>
        <button
          onClick={runSummary}
          disabled={summarizing || observations.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-learn-200 dark:border-learn-800/50 bg-learn-50 dark:bg-learn-950/30 text-learn-700 dark:text-learn-300 text-sm font-semibold hover:bg-learn-100 dark:hover:bg-learn-900/40 disabled:opacity-50 transition-colors"
        >
          {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI summary
        </button>
      </div>

      {/* Voice capture */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-4">
        <VoiceButton
          onTranscribed={handleTranscribed}
          hint={profile?.focus}
          label="Tap to start dictating"
        />
        <p className="text-xs text-slate-400 text-center max-w-sm">
          Audio is transcribed, then discarded. Only the text is saved.
        </p>
      </div>

      {/* Typed entry */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Or type a note</p>
        <form onSubmit={handleManualSave} className="flex flex-col gap-3">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="e.g., Met with supervisor — need to revise methodology by Friday. She mentioned the Walker 2017 paper."
            className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            disabled={savingManual}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!manualText.trim() || savingManual}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {savingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save note
            </button>
          </div>
        </form>
      </div>

      {/* ── Inline action suggestions (appear right here after saving) ── */}
      {pendingActions.length > 0 && (
        <NoteActionSuggestions
          actions={pendingActions}
          onAddTask={handleAddTask}
          onSearchPaper={handleSearchPaper}
          onDismiss={() => setPendingActions([])}
        />
      )}

      {/* AI Summary */}
      {summary && (
        <div className="bg-learn-50/60 dark:bg-learn-950/20 border border-learn-200 dark:border-learn-900/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-learn-700 dark:text-learn-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">AI summary</span>
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setExpandedSummary((x) => !x)}
            >
              {expandedSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {expandedSummary && (
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-3">
              <p>{summary.summary}</p>
              {summary.openQuestions?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Open questions</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    {summary.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
              {summary.suggestedFollowups?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Suggested next steps</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    {summary.suggestedFollowups.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {summaryError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/40">
          {summaryError}
        </div>
      )}

      {/* Entries feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All notes</p>
        </div>
        {observations.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">📝</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">No notes yet. Tap the mic above or type one.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {observations.map((obs) => {
              const isEditing = editingId === obs.id;
              return (
                <div key={obs.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      obs.source === 'voice'
                        ? 'bg-sky-100 dark:bg-sky-950/40'
                        : 'bg-slate-100 dark:bg-slate-800',
                    )}>
                      <Mic className={cn(
                        'w-3.5 h-3.5',
                        obs.source === 'voice' ? 'text-sky-500' : 'text-slate-400',
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span>{formatTime(obs.createdAt)}</span>
                        {obs.durationSec ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                            {formatDuration(obs.durationSec)}
                          </span>
                        ) : null}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full min-h-[80px] px-2 py-1.5 rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {obs.text}
                          </p>
                          {/* Inline bullet summary — fixed dark mode */}
                          {Array.isArray(entryBullets[obs.id]) && (
                            <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                              <p className="text-[10px] font-semibold text-learn-600 dark:text-learn-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI summary
                              </p>
                              <ul className="space-y-1">
                                {(entryBullets[obs.id] as string[]).map((b, i) => (
                                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5">
                                    <span className="text-learn-500 shrink-0 mt-0.5">•</span>
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {entryBullets[obs.id] === 'error' && (
                            <p className="mt-1 text-xs text-red-400">Could not generate summary.</p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors" title="Save">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditText(''); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => runEntryBullets(obs.id, obs.text)}
                            disabled={entryBullets[obs.id] === 'loading'}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              Array.isArray(entryBullets[obs.id])
                                ? 'text-learn-600 bg-learn-50 dark:bg-slate-700'
                                : 'text-slate-400 hover:text-learn-600 hover:bg-slate-100 dark:hover:bg-slate-800',
                            )}
                            title="Summarize as bullet points"
                          >
                            {entryBullets[obs.id] === 'loading'
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Sparkles className="w-4 h-4" />}
                          </button>
                          <button onClick={() => startEdit(obs.id, obs.text)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeObservation(obs.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
