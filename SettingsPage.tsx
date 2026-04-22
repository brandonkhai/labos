import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Beaker, User, Sun, Moon, Monitor, LogOut, Download, Upload, Trash2, Save,
  CheckCircle2,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

const STORAGE_KEY = 'labos.v1';

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
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `labos-workspace-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importAll = async (file: File) => {
    try {
      const text = await file.text();
      // Validate JSON shape before we clobber anything.
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your profile, lab details, and workspace data. Everything lives in your browser —
          nothing is sent to our servers except when you run AI features.
        </p>
      </div>

      {/* --- Your account --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <CardTitle>Your account</CardTitle>
          </div>
          <CardDescription>Who you are. Shown in the sidebar and added to saved items.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
            <Field label="Your name">
              <input
                type="text"
                value={form.user}
                onChange={(e) => updateForm({ user: e.target.value })}
                placeholder="e.g., Brandon Khoury"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm({ email: e.target.value })}
                placeholder="you@school.edu"
                className={inputClass}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => updateForm({ role: e.target.value })}
                className={inputClass}
              >
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
              <input
                type="text"
                value={form.institution}
                onChange={(e) => updateForm({ institution: e.target.value })}
                placeholder="e.g., Tulane University School of Medicine"
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <FormActions saving={saving} saved={saved} />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* --- Lab workspace --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-indigo-600" />
            <CardTitle>Lab workspace</CardTitle>
          </div>
          <CardDescription>
            The lab you're working in. Used as AI context for analyses, chats, and notebook summaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Lab name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="e.g., Metabolism & Virology Group"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Principal investigator (PI)">
              <input
                type="text"
                value={form.pi}
                onChange={(e) => updateForm({ pi: e.target.value })}
                placeholder="e.g., Dr. Alice Smith"
                className={inputClass}
              />
            </Field>
            <Field label="Research focus">
              <textarea
                value={form.focus}
                onChange={(e) => updateForm({ focus: e.target.value })}
                placeholder="One or two sentences describing what the lab studies."
                className={cn(inputClass, 'min-h-[80px] py-2')}
              />
            </Field>
            <Field label="Techniques" hint="Comma-separated.">
              <input
                type="text"
                value={form.techniquesCSV}
                onChange={(e) => updateForm({ techniquesCSV: e.target.value })}
                placeholder="e.g., Western blot, qPCR, flow cytometry"
                className={inputClass}
              />
            </Field>
            <FormActions saving={saving} saved={saved} />
          </form>
        </CardContent>
      </Card>

      {/* --- Appearance --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-indigo-600" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Light, dark, or follow your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <ThemeChoice active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Light" />
            <ThemeChoice active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Dark" />
            <ThemeChoice active={theme === 'system'} onClick={() => setTheme('system')} icon={Monitor} label="System" />
          </div>
        </CardContent>
      </Card>

      {/* --- Data --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <CardTitle>Your data</CardTitle>
          </div>
          <CardDescription>
            Export a full backup of everything (profile, experiments, notebook, papers, hypotheses) as JSON.
            Use it to move between computers or just to hold onto your work.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportAll} className="gap-2">
            <Download className="w-4 h-4" />
            Export workspace (JSON)
          </Button>
          <label className="cursor-pointer inline-flex items-center gap-2 h-10 px-4 py-2 rounded-md text-sm font-medium border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Upload className="w-4 h-4" />
            Import from JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importAll(f);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {/* --- Danger zone --- */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400">Danger zone</CardTitle>
          <CardDescription>
            Signing out clears this browser's workspace. If you want to keep your data, export it first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!confirmingSignOut ? (
            <Button variant="outline" onClick={() => setConfirmingSignOut(true)} className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900/60">
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Sign out and clear this browser's workspace?</span>
              <Button variant="outline" size="sm" onClick={() => setConfirmingSignOut(false)}>Cancel</Button>
              <Button size="sm" onClick={signOut} className="bg-amber-600 hover:bg-amber-700 text-white">
                Yes, sign out
              </Button>
            </div>
          )}
          {!confirmingReset ? (
            <Button variant="outline" onClick={() => setConfirmingReset(true)} className="gap-2 text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-900/60">
              <Trash2 className="w-4 h-4" />
              Reset workspace
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Permanently delete everything in this browser?</span>
              <Button variant="outline" size="sm" onClick={() => setConfirmingReset(false)}>Cancel</Button>
              <Button size="sm" onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white">
                Delete everything
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- small helpers ----------

const inputClass =
  'w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
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

function FormActions({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Saved
        </span>
      )}
    </div>
  );
}

function ThemeChoice({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
        active
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-400'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
      )}
    >
      <Icon className={cn('w-6 h-6', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400')} />
      <span className={cn('text-sm font-medium', active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300')}>
        {label}
      </span>
    </button>
  );
}
