import React from 'react';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Beaker, Plus, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

export function ExperimentsPage() {
  const navigate = useNavigate();
  const { experiments, profile } = useLab();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Experiments</h1>
          <p className="text-slate-500 dark:text-slate-400">Browse all experiments uploaded to {profile?.name || 'the lab'}.</p>
        </div>
        <Button
          onClick={() => navigate('/upload')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New experiment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search experiments by name, ID, model, or researcher…"
                className="w-full h-10 pl-9 pr-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Beaker className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>{searchQuery ? 'No experiments match your search.' : 'No experiments logged yet.'}</p>
              {!searchQuery && (
                <Button onClick={() => navigate('/upload')} variant="outline" className="mt-4">
                  Upload first experiment
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/experiments/${exp.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <Beaker className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{exp.id}</span>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">{exp.name}</h3>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {[exp.type, exp.model, exp.date].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      {exp.researcher && <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{exp.researcher}</p>}
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                          exp.status === 'Analyzed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : exp.status === 'Flagged'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {exp.status}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
