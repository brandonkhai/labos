import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Sun, Moon, Monitor, LogOut, Download, Upload, Trash2, Save, CheckCircle2,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

const STORAGE_KEY = 'labos.v1';

const inputClass =
  'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-400';

function Field({ label, children, hint, required }: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { profile, setProfile } = useLab();

  const [form, setForm] = useState({
    name: profile?.name || '',
    focus: profile?.focus || '',
    techniquesCSV: (profile?.techniques || []).join(', '),
    user: profile?.user || '',
    email: profile?.email || '',
    role: profile?.role || '',
    institution: profile?.institution || '',
    pi: profile?.pi || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const theme = (profile?.theme as 'light' | 'dark' | 'system' | undefined) || 'light';

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const saveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await setProfile({
        ...(profile || { digest: '', techniques: [], focus: '', name: '' }),
        name: form.name.trim(),
        focus: form.focus.trim(),
        techniques: form.techniquesCSV.split(',').map((s) => s.trim()).filter(Boolean),
        user: form.user.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role.trim() || undefined,
        institution: form.institution.trim() || undefined,
        pi: form.pi.trim() || undefined,
        theme,
        digest: profile?.digest || '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const setTheme = async (next: 'light' | 'dark' | 'system') => {
    await setProfile({
      ...(profile || { digest: '', techniques: [], focus: '', name: form.name || 'LabOS' }),
      theme: next,
    });
  };

  const exportAll = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY) || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labos-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importAll = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Not a JSON object');
      window.localStorage.setItem(STORAGE_KEY, text);
      window.location.reload();
    } catch (err: any) {
      alert(`That file doesn't look like a LabOS export.\n\n${err?.message || err}`);
    }
  };

  const signOut = async () => {
    await api.clearAll();
    window.location.reload();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-slide-up">
      <div>
        <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Your account and workspace settings.
        </p>
      </div>

      {/* ── Account ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-brand-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">Your account</p>
        </div>
        <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="Your name">
            <input type="text" value={form.user} onChange={(e) => updateForm({ user: e.target.value })} placeholder="e.g., Brandon Khoury" className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => updateForm({ email: e.target.value })} placeholder="you@school.edu" className={inputClass} />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => updateForm({ role: e.target.value })} className={inputClass}>
              <option value="">Select a role…</option>
              <option>Student</option>
              <option>Medical Student</option>
              <option>Graduate Student</option>
              <option>Postdoc</option>
              <option>Research Assistant</option>
              <option>Technician</option>
              <option>Principal Investigator</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Institution">
            <input type="text" value={form.institution} onChange={(e) => updateForm({ institution: e.target.value })} placeholder="e.g., Tulane University" className={inputClass} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Lab / group name" required>
              <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="e.g., Metabolism & Virology Group" className={inputClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Research focus">
              <textarea value={form.focus} onChange={(e) => updateForm({ focus: e.target.value })} placeholder="One or two sentences describing what you/your lab studies." className={cn(inputClass, 'min-h-[80px] py-2 h-auto')} />
            </Field>
          </div>
          <div className="md:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400">
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Appearance ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-4 h-4 text-xp-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">Appearance</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value as any)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors',
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              <Icon className={cn('w-5 h-5', theme === value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400')} />
              <span className={cn('text-sm font-medium', theme === value ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Data ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-sky-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">Your data</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Export everything (profile, experiments, notes, papers) as JSON. Use it to back up or move between devices.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export (JSON)
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import from JSON
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importAll(f); }} />
          </label>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-5">
        <p className="font-semibold text-red-600 dark:text-red-400 mb-3">Danger zone</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Signing out or resetting clears this browser's workspace. Export your data first if you want to keep it.
        </p>
        <div className="flex flex-wrap gap-3">
          {!confirmingSignOut ? (
            <button onClick={() => setConfirmingSignOut(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
              <LogOut className="w-4 h-4" />Sign out
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 dark:text-slate-400">Sign out and clear workspace?</span>
              <button onClick={() => setConfirmingSignOut(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={signOut} className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors">Yes, sign out</button>
            </div>
          )}
          {!confirmingReset ? (
            <button onClick={() => setConfirmingReset(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <Trash2 className="w-4 h-4" />Reset workspace
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 dark:text-slate-400">Delete everything permanently?</span>
              <button onClick={() => setConfirmingReset(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={signOut} className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">Delete everything</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
