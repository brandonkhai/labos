import React, { useState } from 'react';
import { UploadCloud, File, X, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { useLab, XP } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { VoiceButton } from '@/src/components/VoiceButton';
import { EXPERIMENT_TEMPLATES, type ExperimentTemplate } from '@/src/lib/experimentTemplates';
import { cn } from '@/src/lib/utils';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '', type: '', model: '', conditions: '', timepoints: '', researcher: '', notes: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [templateId, setTemplateId] = useState<string>('blank');
  const navigate = useNavigate();
  const { profile, addExperiment, awardXP } = useLab();

  const applyTemplate = (tpl: ExperimentTemplate) => {
    setTemplateId(tpl.id);
    setMetadata((m) => ({
      ...m,
      type: tpl.metadata.type || m.type,
      model: tpl.metadata.model ?? m.model,
      conditions: tpl.metadata.conditions ?? m.conditions,
      timepoints: tpl.metadata.timepoints ?? m.timepoints,
      notes: m.notes && m.notes.trim().length > 0 ? m.notes : tpl.protocol,
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!metadata.name) setMetadata((m) => ({ ...m, name: e.dataTransfer.files[0].name.replace(/\.[^.]+$/, '') }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      if (!metadata.name) setMetadata((m) => ({ ...m, name: e.target.files![0].name.replace(/\.[^.]+$/, '') }));
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const analysisResult = await api.analyzeExperiment({
            metadata,
            rows: results.data as any[],
            labFocus: profile?.focus,
          });
          const created = await addExperiment({
            name: metadata.name || file.name,
            type: metadata.type || 'Experiment',
            status: 'Analyzed',
            date: new Date().toLocaleDateString(),
            model: metadata.model,
            conditions: metadata.conditions,
            timepoints: metadata.timepoints,
            notes: metadata.notes,
            researcher: metadata.researcher || profile?.name,
            analysisResult,
            rawDataPreview: (results.data as any[]).slice(0, 10),
          });
          awardXP(XP.EXPERIMENT);
          navigate(`/experiments/${created.id}`);
        } catch (err: any) {
          setError(err?.message || 'Analysis failed. Check the browser console and server logs.');
        } finally {
          setIsAnalyzing(false);
        }
      },
      error: (err) => {
        setError('Failed to parse the CSV. Make sure it is a valid comma-separated file.');
        setIsAnalyzing(false);
      },
    });
  };

  const inputClass = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400';

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-slide-up">
      <div>
        <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">
          New experiment
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
          Upload a CSV and describe what it is — AI will analyze it.
          <span className="flex items-center gap-0.5 text-xp-600 font-medium ml-1">
            <Zap className="w-3.5 h-3.5" />+{XP.EXPERIMENT} XP
          </span>
        </p>
      </div>

      {/* Templates */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-learn-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Start from a template</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EXPERIMENT_TEMPLATES.map((tpl) => {
            const active = templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                title={tpl.blurb}
                className={cn(
                  'text-left p-3 rounded-xl border text-sm transition-all',
                  active
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-500 text-brand-900 dark:text-brand-100'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600',
                )}
              >
                <div className="font-semibold text-xs">{tpl.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{tpl.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* File upload */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">Data file</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">CSV or TSV export from your instrument.</p>
          {!file ? (
            <div
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">CSV or TSV</p>
              <input id="file-upload" type="file" className="hidden" accept=".csv,.tsv,.txt" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="bg-brand-100 dark:bg-brand-950/40 p-2.5 rounded-xl">
                <File className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-0.5">Experiment details</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">All optional but help the AI.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name</label>
            <input type="text" placeholder="e.g., Glucose titration pilot 2" className={inputClass} value={metadata.name} onChange={(e) => setMetadata({ ...metadata, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Type / assay</label>
              <input type="text" placeholder="RT-qPCR, flow, Western…" className={inputClass} value={metadata.type} onChange={(e) => setMetadata({ ...metadata, type: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Model / subject</label>
              <input type="text" placeholder="HFF cells, C57BL/6…" className={inputClass} value={metadata.model} onChange={(e) => setMetadata({ ...metadata, model: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
              <VoiceButton compact hint={profile?.focus} label="Dictate notes" onTranscribed={(text) => setMetadata((m) => ({ ...m, notes: m.notes ? `${m.notes.trimEnd()} ${text}` : text }))} />
            </div>
            <textarea placeholder="Protocol deviations, known issues, etc." className={cn(inputClass, 'min-h-[72px] py-2 h-auto resize-none')} value={metadata.notes} onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })} />
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/40">
              {error}
            </div>
          )}
          <button
            className="w-full py-2.5 rounded-full bg-coral-500 hover:bg-coral-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            disabled={!file || isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run AI analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
