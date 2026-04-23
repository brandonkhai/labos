import React, { useState } from 'react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { Search, Loader2, PencilLine, Beaker } from 'lucide-react';

type Mode = 'pick' | 'search' | 'manual';

export function Onboarding() {
  const [mode, setMode] = useState<Mode>('pick');
  const [labName, setLabName] = useState('');
  const [focus, setFocus] = useState('');
  const [techniquesCSV, setTechniquesCSV] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setProfile } = useLab();

  const inputClass = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.searchLab(labName.trim());
      await setProfile({ name: data.name || labName.trim(), focus: data.focus || '', techniques: data.techniques || [], digest: data.digest || '' });
    } catch (err: any) {
      setError(
        err?.message?.includes('GEMINI_API_KEY')
          ? 'The server is missing GEMINI_API_KEY. Add it to .env.local and restart, or switch to "Set up manually".'
          : 'Could not look that lab up. Try a more specific name or set it up manually.',
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
        techniques: techniquesCSV.split(',').map((s) => s.trim()).filter(Boolean),
        digest: '',
      });
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
          <div className="mx-auto bg-brand-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-md">
            <Beaker className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100 mb-2">
            Welcome to LabOS 🎉
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your personal lab notebook and learning companion. Let's get you set up!
          </p>
        </div>

        <div className="p-6">
          {mode === 'pick' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Look up an existing lab</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Search by lab name, PI, or institution to pre-fill your workspace.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                  <PencilLine className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Set up manually</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Type your lab name and focus yourself. Fastest option!
                  </p>
                </div>
              </button>
            </div>
          )}

          {mode === 'search' && (
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lab name, PI, or institution</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input id="labName" type="text" placeholder="e.g., Sabatini Lab MIT" className={inputClass + ' pl-9'} value={labName} onChange={(e) => setLabName(e.target.value)} disabled={loading} autoFocus required />
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/40">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('pick')} disabled={loading} className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading || !labName.trim()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Searching…</> : 'Initialize workspace'}
                </button>
              </div>
            </form>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManual} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lab / group name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g., Metabolism & Virology Group" className={inputClass} value={labName} onChange={(e) => setLabName(e.target.value)} disabled={loading} autoFocus required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Research focus</label>
                <textarea placeholder="One or two sentences about what you study." className={inputClass + ' min-h-[72px] py-2 h-auto'} value={focus} onChange={(e) => setFocus(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Techniques you use <span className="text-xs text-slate-400">(comma-separated)</span></label>
                <input type="text" placeholder="e.g., Western blot, qPCR, flow cytometry" className={inputClass} value={techniquesCSV} onChange={(e) => setTechniquesCSV(e.target.value)} disabled={loading} />
              </div>
              {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/40">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('pick')} disabled={loading} className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading || !labName.trim()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {loading ? 'Saving…' : '🚀 Create workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
