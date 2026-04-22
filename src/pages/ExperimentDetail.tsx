import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  AlertCircle, CheckCircle2, ArrowRight, MessageSquare, Lightbulb, Send, Loader2,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { VoiceButton } from '@/src/components/VoiceButton';

const FALLBACK_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const { experiments, profile, papers } = useLab();
  const experiment = experiments.find((e) => e.id === id);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);

  if (!experiment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
        <h2 className="text-xl font-semibold text-slate-800">Experiment not found</h2>
        <p className="text-slate-500 text-sm">
          This experiment may have been deleted, or you're opening a link from an older session.
        </p>
        <Link to="/experiments" className="text-indigo-600 text-sm hover:underline">
          Back to experiments
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI-generated visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={chartConfig.xAxisKey} stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend verticalAlign="top" height={36} />
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
        </CardContent>
      </Card>
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
      setChat([...next, { role: 'assistant', content: `Sorry — the model call failed: ${err?.message || err}` }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
              {experiment.id}: {experiment.name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                experiment.status === 'Analyzed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {experiment.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {[experiment.type, experiment.model, experiment.date, experiment.researcher]
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI analysis narrative</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap">
                {hasAnalysis
                  ? (analysis.narrative || 'The model returned no narrative for this run.')
                  : 'No analysis attached to this experiment yet.'}
              </div>
            </CardContent>
          </Card>

          {renderChart()}
        </div>

        <div className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <CardTitle className="text-base">QC &amp; statistical flags</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {Array.isArray(analysis?.qcFlags) && analysis.qcFlags.length > 0 ? (
                <ul className="space-y-3 text-sm text-amber-900">
                  {analysis.qcFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <p
                        dangerouslySetInnerHTML={{
                          __html: flag.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-amber-900/80">No QC flags raised.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Lightbulb className="w-5 h-5" />
                <CardTitle className="text-base">Suggested next steps</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {Array.isArray(analysis?.nextSteps) && analysis.nextSteps.length > 0 ? (
                <div className="space-y-4">
                  {analysis.nextSteps.map((step: string, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">Step {idx + 1}</p>
                      <p className="text-xs text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No next-step suggestions.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-slate-700">
                <MessageSquare className="w-5 h-5" />
                <CardTitle className="text-base">Ask LabOS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chat.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Ask anything about this analysis — the model has the data, your metadata, and
                    saved papers as context.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {chat.map((m, i) => (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded-md ${
                          m.role === 'user'
                            ? 'bg-indigo-50 text-indigo-900'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="font-semibold mr-1">
                          {m.role === 'user' ? 'You:' : 'LabOS:'}
                        </span>
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={sendChat} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type or dictate a question…"
                    disabled={asking}
                    className="w-full h-9 px-3 pr-16 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="absolute right-1 top-1 flex items-center gap-0.5">
                    <VoiceButton
                      compact
                      hint={profile?.focus}
                      label="Dictate question"
                      disabled={asking}
                      onTranscribed={(text) =>
                        setInput((prev) => (prev ? `${prev} ${text}` : text))
                      }
                    />
                    <button
                      type="submit"
                      disabled={asking || !input.trim()}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                    >
                      {asking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
