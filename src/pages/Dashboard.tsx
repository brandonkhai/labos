import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Activity, AlertTriangle, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { profile, experiments, papers, hypotheses } = useLab();

  const flagged = experiments.filter((e) => e.status === 'Flagged');
  const supported = hypotheses.filter((h) => h.status === 'supported').length;
  const testing = hypotheses.filter((h) => h.status === 'testing').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of recent activity and AI insights for {profile?.name}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experiments</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experiments.length}</div>
            <p className="text-xs text-slate-500">Across all uploads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hypotheses</CardTitle>
            <Lightbulb className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hypotheses.length}</div>
            <p className="text-xs text-slate-500">
              {supported} supported · {testing} testing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QC flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flagged.length}</div>
            <p className="text-xs text-slate-500">Require review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Library papers</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{papers.length}</div>
            <p className="text-xs text-slate-500">Saved from PubMed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest experiments uploaded to the hub.</CardDescription>
          </CardHeader>
          <CardContent>
            {experiments.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing uploaded yet —{' '}
                <Link className="text-indigo-600 hover:underline" to="/upload">
                  run your first analysis
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-5">
                {experiments.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    to={`/experiments/${item.id}`}
                    className="flex items-center hover:bg-slate-50 rounded-md -mx-2 px-2 py-2 transition-colors"
                  >
                    <div className="ml-2 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{item.name}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {item.type}
                        {item.date ? ` • ${item.date}` : ''}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          item.status === 'Analyzed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'Flagged'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>AI lab digest</CardTitle>
            <CardDescription>Context the model is using when analyzing your data.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 space-y-4">
              <p>
                <strong>Research focus:</strong> {profile?.focus || '—'}
              </p>
              {profile?.digest && (
                <p>
                  <strong>Recent notes:</strong> {profile.digest}
                </p>
              )}
              <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100">
                <p className="font-medium text-indigo-900 mb-1">Suggested next step</p>
                <p className="text-indigo-800">
                  {flagged.length > 0
                    ? 'Review the flagged experiments and cross-reference with recent publications in your library.'
                    : experiments.length === 0
                      ? 'Upload a CSV from your most recent run to see how the AI interprets it.'
                      : 'Search PubMed for related work and pin a few papers to your library to ground the next round of analysis.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
