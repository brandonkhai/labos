import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Lightbulb, Plus, CheckCircle2, XCircle, HelpCircle, Trash2, X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

export function HypothesesPage() {
  const { hypotheses, profile, addHypothesis, updateHypothesis, removeHypothesis } = useLab();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ prediction: '', reasoning: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.prediction.trim()) return;
    await addHypothesis({
      prediction: draft.prediction.trim(),
      reasoning: draft.reasoning.trim(),
      status: 'testing',
      researcher: profile?.name || 'You',
    });
    setDraft({ prediction: '', reasoning: '' });
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hypothesis board</h1>
          <p className="text-slate-500">
            Track, test, and evaluate scientific bets for {profile?.name || 'the lab'}.
          </p>
        </div>
        <Button
          onClick={() => setCreating((c) => !c)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Cancel' : 'Register hypothesis'}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New hypothesis</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Prediction</label>
                <input
                  type="text"
                  value={draft.prediction}
                  onChange={(e) => setDraft({ ...draft, prediction: e.target.value })}
                  placeholder="e.g., Knocking out gene X will reduce phenotype Y by >50%."
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Reasoning</label>
                <textarea
                  value={draft.reasoning}
                  onChange={(e) => setDraft({ ...draft, reasoning: e.target.value })}
                  placeholder="Why do you think this is true? Cite experiments, papers, intuition."
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Save hypothesis
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {hypotheses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-white">
            <Lightbulb className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p>No hypotheses registered yet.</p>
          </div>
        ) : (
          hypotheses.map((h) => (
            <Card
              key={h.id}
              className={cn(
                'border-l-4',
                h.status === 'testing'
                  ? 'border-l-amber-500'
                  : h.status === 'supported'
                    ? 'border-l-emerald-500'
                    : 'border-l-red-500',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{h.id}</CardTitle>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                          h.status === 'testing'
                            ? 'bg-amber-100 text-amber-700'
                            : h.status === 'supported'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700',
                        )}
                      >
                        {h.status === 'testing' && <HelpCircle className="w-3 h-3" />}
                        {h.status === 'supported' && <CheckCircle2 className="w-3 h-3" />}
                        {h.status === 'refuted' && <XCircle className="w-3 h-3" />}
                        {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-2">
                      <span className="text-indigo-600 font-semibold">Prediction:</span> {h.prediction}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <p>{h.researcher}</p>
                    <p>{h.date}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {h.reasoning && (
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Reasoning:</span> {h.reasoning}
                  </div>
                )}
                {h.aiNote && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-sm text-slate-700 flex gap-3 items-start">
                    <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-indigo-900">AI note:</span> {h.aiNote}
                    </div>
                  </div>
                )}
                {h.experiments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-slate-500 py-1">Linked experiments:</span>
                    {h.experiments.map((exp) => (
                      <span
                        key={exp}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 justify-end gap-2">
                {h.status === 'testing' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => updateHypothesis(h.id, { status: 'supported' })}
                    >
                      Mark supported
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => updateHypothesis(h.id, { status: 'refuted' })}
                    >
                      Mark refuted
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => removeHypothesis(h.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
