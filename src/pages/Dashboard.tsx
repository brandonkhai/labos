import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Beaker, GraduationCap, BookMarked, ArrowRight, Flame, Zap } from 'lucide-react';
import { useLab, levelName } from '@/src/lib/context';
import { cn } from '@/src/lib/utils';

const DAILY_TIPS = [
  "Always label your tubes immediately — future you will thank present you.",
  "When troubleshooting a failed Western, check antibody concentration before blaming the protocol.",
  "A good notebook entry includes what you expected to happen, not just what did.",
  "If something looks weird under the microscope, image it before anything else — you can't un-look.",
  "Controls aren't optional. A result without a control is a question, not an answer.",
  "Before asking your mentor, write down your three best guesses for what went wrong.",
  "Replicates tell you if the effect is real. Repeats tell you if it's reproducible. Both matter.",
  "Date every gel image, every tube, every plate. Seriously. Every one.",
  "If you're tired and rushed, it's better to pause an experiment than to rush through it.",
  "Reading one paper a day, even briefly, compounds faster than you'd expect over a semester.",
  "Write your methods as you do them, not after. Memory is unreliable after a 6-hour protocol.",
  "qPCR triplicates exist for a reason — don't skip them when you're in a hurry.",
  "A failed experiment that teaches you something is not a wasted experiment.",
  "Your PI would rather hear about a problem early than a disaster late.",
  "Keep a 'parking lot' in your notebook for random ideas — review it weekly.",
];

function getTodayTip(): string {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return DAILY_TIPS[day % DAILY_TIPS.length];
}

function QuickActionCard({
  icon: Icon,
  label,
  sublabel,
  to,
  colorClass,
  bgClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  to: string;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-md',
        bgClass,
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClass)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 mt-auto self-end transition-colors" />
    </Link>
  );
}

export function Dashboard() {
  const { profile, experiments, papers, observations, gamification } = useLab();

  const { xp, streak, longestStreak } = gamification;
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  const todayIso = new Date().toDateString();
  const todayNotes = observations.filter(
    (o) => new Date(o.createdAt).toDateString() === todayIso,
  ).length;

  const recentExps = useMemo(() => experiments.slice(0, 4), [experiments]);
  const tip = useMemo(() => getTodayTip(), []);

  const displayName = profile?.user?.split(' ')[0] || profile?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Greeting */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">
            Hey, {displayName}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-streak-500/10 to-xp-500/10 border border-streak-200 dark:border-streak-900/50">
            <span className="text-2xl animate-streak-wiggle">🔥</span>
            <div>
              <p className="text-sm font-bold text-streak-600 dark:text-streak-400 leading-tight">
                {streak}-day streak!
              </p>
              <p className="text-xs text-slate-400">Best: {longestStreak}</p>
            </div>
          </div>
        )}
      </div>

      {/* XP / Level bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-xp-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Level {level} · {levelName(level)}
            </span>
          </div>
          <span className="text-sm font-bold text-xp-600 dark:text-xp-400">{xp} XP total</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-xp-400 to-xp-500 rounded-full transition-all duration-700"
            style={{ width: `${xpInLevel}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{100 - xpInLevel} XP to level {level + 1}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Notes today', value: todayNotes, emoji: '📝', color: 'text-sky-600' },
          { label: 'Experiments', value: experiments.length, emoji: '🧪', color: 'text-coral-600' },
          { label: 'Papers saved', value: papers.length, emoji: '📄', color: 'text-learn-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <div className="text-2xl mb-1">{stat.emoji}</div>
            <div className={cn('text-2xl font-display font-900', stat.color)}>{stat.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display font-800 text-base text-slate-700 dark:text-slate-300 mb-3">
          What do you want to do?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard
            icon={BookOpen}
            label="Add a note"
            sublabel="+10 XP"
            to="/notes"
            colorClass="bg-sky-500"
            bgClass="border-sky-100 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-900/40"
          />
          <QuickActionCard
            icon={Beaker}
            label="Log experiment"
            sublabel="+25 XP"
            to="/experiments"
            colorClass="bg-coral-500"
            bgClass="border-coral-100 bg-coral-50/60 dark:bg-coral-950/20 dark:border-coral-900/40"
          />
          <QuickActionCard
            icon={GraduationCap}
            label="Learn something"
            sublabel="Protocols & glossary"
            to="/learn"
            colorClass="bg-learn-500"
            bgClass="border-learn-100 bg-learn-50/60 dark:bg-learn-950/20 dark:border-learn-900/40"
          />
          <QuickActionCard
            icon={BookMarked}
            label="Find a paper"
            sublabel="+15 XP when saved"
            to="/library"
            colorClass="bg-brand-500"
            bgClass="border-brand-100 bg-brand-50/60 dark:bg-brand-950/20 dark:border-brand-900/40"
          />
        </div>
      </div>

      {/* Daily tip */}
      <div className="bg-gradient-to-r from-learn-50 to-brand-50 dark:from-learn-950/30 dark:to-brand-950/30 border border-learn-200 dark:border-learn-900/40 rounded-2xl p-4 flex gap-3">
        <span className="text-2xl shrink-0">💡</span>
        <div>
          <p className="text-xs font-semibold text-learn-600 dark:text-learn-400 uppercase tracking-wide mb-1">
            Today's tip
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{tip}</p>
        </div>
      </div>

      {/* Recent experiments */}
      {recentExps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-800 text-base text-slate-700 dark:text-slate-300">
              Recent experiments
            </h2>
            <Link to="/experiments" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentExps.map((exp) => (
              <Link
                key={exp.id}
                to={`/experiments/${exp.id}`}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-coral-100 dark:bg-coral-950/40 flex items-center justify-center shrink-0">
                  <Beaker className="w-4 h-4 text-coral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{exp.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {[exp.type, exp.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                  exp.status === 'Analyzed'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : exp.status === 'Flagged'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                )}>
                  {exp.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state (first visit) */}
      {experiments.length === 0 && observations.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-brand-200 dark:border-brand-800/50 p-8 text-center">
          <p className="text-3xl mb-3">🧬</p>
          <p className="font-display font-800 text-lg text-slate-700 dark:text-slate-300 mb-2">
            You're all set!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Add your first note or log an experiment to start earning XP.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link
              to="/notes"
              className="px-4 py-2 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              Add first note
            </Link>
            <Link
              to="/experiments"
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Log experiment
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
