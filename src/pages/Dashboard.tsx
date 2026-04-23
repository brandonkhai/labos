import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Beaker, CheckSquare, BookMarked, ArrowUpRight } from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { cn } from '@/src/lib/utils';

const QUICK_ACTIONS = [
  {
    icon: BookOpen,
    label: 'New note',
    sublabel: 'Voice or typed',
    to: '/notes',
    accent: 'text-sky-500',
    ring: 'hover:ring-sky-200 dark:hover:ring-sky-900',
  },
  {
    icon: Beaker,
    label: 'Log experiment',
    sublabel: 'Upload & analyze data',
    to: '/experiments',
    accent: 'text-coral-500',
    ring: 'hover:ring-coral-200 dark:hover:ring-coral-900',
  },
  {
    icon: CheckSquare,
    label: 'Tasks',
    sublabel: 'Track what\'s due',
    to: '/tasks',
    accent: 'text-learn-500',
    ring: 'hover:ring-learn-200 dark:hover:ring-learn-900',
  },
  {
    icon: BookMarked,
    label: 'Literature',
    sublabel: 'Search PubMed',
    to: '/library',
    accent: 'text-brand-500',
    ring: 'hover:ring-brand-200 dark:hover:ring-brand-900',
  },
];

const STATUS_COLORS: Record<string, string> = {
  Analyzed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Flagged:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Draft:    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export function Dashboard() {
  const { profile, experiments, papers, observations, todos } = useLab();

  const todayIso = new Date().toDateString();
  const todayNotes = observations.filter(
    (o) => new Date(o.createdAt).toDateString() === todayIso,
  ).length;

  const activeTasks = useMemo(
    () => todos.filter((t) => !t.done).length,
    [todos],
  );

  const recentExps = useMemo(() => experiments.slice(0, 5), [experiments]);

  const displayName =
    profile?.user?.split(' ')[0] || profile?.name?.split(' ')[0] || 'there';

  const isEmpty = experiments.length === 0 && observations.length === 0;

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl mx-auto">

      {/* ── Greeting ── */}
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {displayName}'s workspace
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {[
          { label: 'Notes today',  value: todayNotes,         color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Experiments',  value: experiments.length, color: 'text-coral-500' },
          { label: 'Papers saved', value: papers.length,      color: 'text-brand-600 dark:text-brand-400' },
          { label: 'Open tasks',   value: activeTasks,        color: 'text-learn-600 dark:text-learn-400' },
        ].map((stat) => (
          <div key={stat.label} className="py-4 px-5 text-center">
            <div className={cn('text-2xl font-bold tabular-nums', stat.color)}>
              {stat.value}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
          Quick access
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className={cn(
                'group flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
                'transition-all hover:shadow-sm hover:ring-2',
                a.ring,
              )}
            >
              <div className="flex items-center justify-between">
                <a.icon className={cn('w-4.5 h-4.5', a.accent)} />
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.sublabel}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent experiments ── */}
      {recentExps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Recent experiments
            </p>
            <Link
              to="/experiments"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {recentExps.map((exp) => (
              <Link
                key={exp.id}
                to={`/experiments/${exp.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-coral-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {exp.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {[exp.type, exp.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0',
                    STATUS_COLORS[exp.status ?? ''] ?? STATUS_COLORS.Draft,
                  )}
                >
                  {exp.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
          <Beaker className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
            Your workspace is empty
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
            Add a note or log an experiment to get started.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link
              to="/notes"
              className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Add first note
            </Link>
            <Link
              to="/experiments"
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Log experiment
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
