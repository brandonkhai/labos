import React, { useState } from 'react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Beaker, Search, Loader2, PencilLine } from 'lucide-react';

type Mode = 'pick' | 'search' | 'manual';

export function Onboarding() {
  const [mode, setMode] = useState<Mode>('pick');
  const [labName, setLabName] = useState('');
  const [focus, setFocus] = useState('');
  const [techniquesCSV, setTechniquesCSV] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setProfile } = useLab();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.searchLab(labName.trim());
      await setProfile({
        name: data.name || labName.trim(),
        focus: data.focus || '',
        techniques: data.techniques || [],
        digest: data.digest || '',
      });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message?.includes('GEMINI_API_KEY')
          ? 'The server is missing GEMINI_API_KEY. Add it to .env.local and restart, or switch to "Set up manually".'
          : 'Could not look that lab up. Try a more specific name (e.g. "Smith Lab Stanford") or set it up manually.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await setProfile({
        name: labName.trim(),
        focus: focus.trim(),
        techniques: techniquesCSV
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        digest: '',
      });
    } catch (err: any) {
      setError(err?.message || 'Could not save your lab profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg shadow-lg border-slate-200">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Welcome to LabOS</CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            Set up a workspace for your lab. Everything is editable later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'pick' && (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition-colors"
              >
                <Search className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Look up an existing lab</p>
                  <p className="text-sm text-slate-500">
                    Use web search to pre-fill focus, techniques, and a starter digest. Good for established labs with a public profile.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition-colors"
              >
                <PencilLine className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Set up manually</p>
                  <p className="text-sm text-slate-500">
                    Type the lab name, research focus, and a few techniques yourself. Fastest path to a working workspace.
                  </p>
                </div>
              </button>
            </div>
          )}

          {mode === 'search' && (
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="labName" className="text-sm font-medium text-slate-700">
                  Lab name, PI, or institution
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="labName"
                    type="text"
                    placeholder="e.g., Sabatini Lab MIT"
                    className="w-full h-10 pl-9 pr-4 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode('pick')} disabled={loading}>
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading || !labName.trim()}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching…
                    </span>
                  ) : (
                    'Initialize from web search'
                  )}
                </Button>
              </div>
            </form>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManual} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Lab name</label>
                <input
                  type="text"
                  placeholder="e.g., Metabolism & Virology Group"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Research focus</label>
                <textarea
                  placeholder="One or two sentences describing what the lab studies."
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Techniques (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., RNA-seq, flow cytometry, Western blot"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={techniquesCSV}
                  onChange={(e) => setTechniquesCSV(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode('pick')} disabled={loading}>
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading || !labName.trim()}
                >
                  {loading ? 'Saving…' : 'Create workspace'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
