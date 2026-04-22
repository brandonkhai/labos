import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Mic, Trash2, Edit2, Check, X, Loader2, Sparkles, NotebookPen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { VoiceButton } from '@/src/components/VoiceButton';
import { useLab } from '@/src/lib/context';
import { api, type NotebookSummary } from '@/src/lib/api';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDuration(sec?: number) {
  if (!sec) return '';
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function NotebookPage() {
  const { observations, profile, addObservation, updateObservation, removeObservation } = useLab();
  const [manualText, setManualText] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [summary, setSummary] = useState<NotebookSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [expandedSummary, setExpandedSummary] = useState(true);

  const todayIso = new Date().toDateString();
  const todayCount = observations.filter(
    (o) => new Date(o.createdAt).toDateString() === todayIso,
  ).length;

  const handleTranscribed = async (text: string, meta: { durationSec: number }) => {
    if (!text.trim()) return;
    await addObservation({
      text: text.trim(),
      source: 'voice',
      durationSec: meta.durationSec,
    });
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSavingManual(true);
    try {
      await addObservation({ text: manualText.trim(), source: 'typed' });
      setManualText('');
    } finally {
      setSavingManual(false);
    }
  };

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateObservation(editingId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const runSummary = async () => {
    setSummarizing(true);
    setSummaryError('');
    try {
      // Summarize most recent ~20 entries, newest-last so the model reads chronologically.
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Lab notebook</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Hands-free observations. Tap the mic, talk, stop — LabOS transcribes and saves it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={runSummary}
            disabled={summarizing || observations.length === 0}
          >
            {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Summarize recent
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-4">
          <VoiceButton
            onTranscribed={handleTranscribed}
            hint={profile?.focus}
            label="Tap to start dictating"
          />
          <p className="text-xs text-slate-400 text-center max-w-sm">
            Audio is sent to the server, transcribed with Gemini, then discarded. Only the
            text is saved. You can edit or delete any entry later.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base">Or type an observation</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleManualSave} className="flex flex-col gap-3">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="e.g., Cells look ~80% confluent. Splitting before adding drug."
              className="w-full min-h-[72px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={savingManual}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!manualText.trim() || savingManual}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {summary && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                <Sparkles className="w-4 h-4" />
                AI summary of recent entries
              </CardTitle>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setExpandedSummary((x) => !x)}
              >
                {expandedSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </CardHeader>
          {expandedSummary && (
            <CardContent className="pt-0 text-sm text-slate-700 space-y-3">
              <p>{summary.summary}</p>
              {summary.observations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Observations
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.observations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.openQuestions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Open questions
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.openQuestions.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.suggestedFollowups?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Suggested followups
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.suggestedFollowups.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
      {summaryError && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
          {summaryError}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Entries</CardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {observations.length} total · {todayCount} today
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {observations.length === 0 ? (
            <div className="p-10 text-center text-slate-500 dark:text-slate-400">
              <NotebookPen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm">No entries yet. Tap the mic above or type one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {observations.map((obs) => {
                const isEditing = editingId === obs.id;
                return (
                  <div key={obs.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg shrink-0 mt-0.5">
                        <Mic
                          className={`w-4 h-4 ${
                            obs.source === 'voice' ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>{formatTime(obs.createdAt)}</span>
                          {obs.durationSec ? (
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                              {formatDuration(obs.durationSec)}
                            </span>
                          ) : null}
                          <span className="text-slate-400">· {obs.source}</span>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full min-h-[80px] px-2 py-1.5 rounded-md border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {obs.text}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditText(''); }}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-100"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(obs.id, obs.text)}
                              className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeObservation(obs.id)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100"
                              title="Delete"
                            >
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
        </CardContent>
      </Card>
    </div>
  );
}
