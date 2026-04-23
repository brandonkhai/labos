import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  AlertCircle, Lightbulb, Send, Loader2,
  Download, FileText, Trash2, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { VoiceButton } from '@/src/components/VoiceButton';
import { Markdown } from '@/src/components/Markdown';
import { exportExperimentJson, exportExperimentPdf } from '@/src/lib/exportExperiment';
import { cn } from '@/src/lib/utils';

const FALLBACK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { experiments, profile, papers, observations, removeExperiment } = useLab();
  const experiment = experiments.find((e) => e.id === id);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!experiment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-3">
        <p className="text-slate-400 text-4xl mb-4">🔬</p>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Experiment not found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          This experiment may have been deleted or the link is stale.
        </p>
        <Link to="/experiments" className="inline-flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline mt-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to experiments
        </Link>
      </div>
    );
  }

  const analysis = experiment.analysisResult;
  const hasAnalysis = Boolean(analysis);

  const renderChart = () => {
    const chartData = analysis?.chartData;
    const chartConfig = analysis?.chartConfig;
    if (!Array.isArray(chartData) || chartData.length === 0 || !chartConfig) return null;

    const ChartComponent = chartConfig.type === 'bar' ? BarChart : LineChart;
    const DataComponent: any = chartConfig.type === 'bar' ? Bar : Line;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Visualization</p>
        </div>
        <div className="p-5">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={chartConfig.xAxisKey} stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" />
                {(chartConfig.series || []).map((s: any, i: number) => (
                  <DataComponent
                    key={s.dataKey || i}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name || s.dataKey}
                    stroke={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                    fill={s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    radius={chartConfig.type === 'bar' ? [4, 4, 0, 0] : undefined}
                  />
                ))}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    const next: ChatMsg[] = [...chat, { role: 'user', content: q }];
    setChat(next);
    setInput('');
    setAsking(true);
    try {
      const { reply } = await api.chat(next, {
        labProfile: profile,
        experiment: {
          id: experiment.id,
          name: experiment.name,
          type: experiment.type,
          model: experiment.model,
          conditions: experiment.conditions,
          timepoints: experiment.timepoints,
          notes: experiment.notes,
          analysisResult: analysis,
          dataPreview: experiment.rawDataPreview,
        },
        libraryPapers: papers.slice(0, 6).map((p) => ({
          title: p.title,
          authors: p.authors,
          journal: p.journal,
          year: p.year,
          summary: p.summary || p.abstract,
          url: p.url,
        })),
      });
      setChat([...next, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setChat([...next, { role: 'assistant', content: `Request failed: ${err?.message || err}` }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">

      {/* ── Header ── */}
      <div>
        <Link
          to="/experiments"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All experiments
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {experiment.name}
              </h1>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 shrink-0',
                  experiment.status === 'Analyzed'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                {experiment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              {[experiment.id, experiment.type, experiment.model, experiment.date, experiment.researcher]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                const related = observations.filter((o) => o.experimentId === experiment.id);
                exportExperimentPdf(experiment, related, { labName: profile?.name, user: profile?.user });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Save as PDF"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => {
                const related = observations.filter((o) => o.experimentId === experiment.id);
                exportExperimentJson(experiment, related);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => { await removeExperiment(experiment.id); navigate('/experiments'); }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-5 md:grid-cols-3">

        {/* Left column: narrative + chart */}
        <div className="md:col-span-2 space-y-5">

          {/* AI narrative */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI analysis</p>
              {hasAnalysis && (
                <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">
                  Gemini · gemini-2.5-flash
                </span>
              )}
            </div>
            <div className="p-5">
              {hasAnalysis ? (
                <Markdown className="text-sm text-slate-700 dark:text-slate-300">
                  {analysis.narrative || 'No narrative returned for this run.'}
                </Markdown>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No analysis attached yet. Upload data from the Experiments list to run a full analysis.
                </p>
              )}
            </div>
          </div>

          {renderChart()}
        </div>

        {/* Right column: flags, next steps, chat */}
        <div className="space-y-5">

          {/* QC flags */}
          <div className={cn(
            'rounded-xl border overflow-hidden',
            Array.isArray(analysis?.qcFlags) && analysis.qcFlags.length > 0
              ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
          )}>
            <div className="px-4 py-3 border-b border-amber-200/70 dark:border-amber-800/30 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                QC flags
              </p>
            </div>
            <div className="p-4">
              {Array.isArray(analysis?.qcFlags) && analysis.qcFlags.length > 0 ? (
                <ul className="space-y-2.5">
                  {analysis.qcFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <Markdown className="text-sm text-amber-900 dark:text-amber-200">
                        {flag}
                      </Markdown>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No flags raised.</p>
              )}
            </div>
          </div>

          {/* Next steps */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-brand-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Next steps
              </p>
            </div>
            <div className="p-4">
              {Array.isArray(analysis?.nextSteps) && analysis.nextSteps.length > 0 ? (
                <ol className="space-y-3">
                  {analysis.nextSteps.map((step: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 font-mono mt-0.5 w-4 shrink-0">
                        {idx + 1}
                      </span>
                      <Markdown className="text-sm text-slate-600 dark:text-slate-400">{step}</Markdown>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  No suggestions generated.
                </p>
              )}
            </div>
          </div>

          {/* Experiment chat */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Ask about this experiment
              </p>
            </div>
            <div className="p-4 space-y-3">
              {chat.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Ask anything — the model has this experiment's data, metadata, and your saved papers.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {chat.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-xs rounded-lg px-3 py-2.5',
                        m.role === 'user'
                          ? 'bg-brand-500 text-white ml-6'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <Markdown className="text-xs text-slate-700 dark:text-slate-300">
                          {m.content}
                        </Markdown>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={sendChat} className="flex gap-1.5">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question…"
                    disabled={asking}
                    className="w-full h-8 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                  <div className="absolute right-0.5 top-0.5">
                    <VoiceButton
                      compact
                      hint={profile?.focus}
                      label="Dictate question"
                      disabled={asking}
                      onTranscribed={(text) =>
                        setInput((prev) => (prev ? `${prev} ${text}` : text))
                      }
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={asking || !input.trim()}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40 transition-colors shrink-0"
                >
                  {asking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
