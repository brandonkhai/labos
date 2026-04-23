import React from 'react';
import { Beaker, Plus, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

export function ExperimentsPage() {
  const navigate = useNavigate();
  const { experiments } = useLab();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filtered = experiments.filter((exp) => {
    const q = searchQuery.toLowerCase();
    return (
      exp.name.toLowerCase().includes(q) ||
      exp.id.toLowerCase().includes(q) ||
      (exp.model || '').toLowerCase().includes(q) ||
      (exp.researcher || '').toLowerCase().includes(q) ||
      (exp.type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">Experiments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {experiments.length} logged
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral-500 hover:bg-coral-600 text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          New experiment
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, type, model…"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-4xl mb-3">🧪</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              {searchQuery ? 'No experiments match your search.' : 'No experiments logged yet.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/upload')}
                className="px-5 py-2 rounded-full bg-coral-500 text-white text-sm font-semibold hover:bg-coral-600 transition-colors"
              >
                Log your first experiment
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                onClick={() => navigate(`/experiments/${exp.id}`)}
              >
                <div className="w-9 h-9 rounded-xl bg-coral-100 dark:bg-coral-950/40 flex items-center justify-center shrink-0 group-hover:bg-coral-200 dark:group-hover:bg-coral-900/50 transition-colors">
                  <Beaker className="w-4 h-4 text-coral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{exp.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {[exp.type, exp.model, exp.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    exp.status === 'Analyzed'
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : exp.status === 'Flagged'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}>
                    {exp.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
