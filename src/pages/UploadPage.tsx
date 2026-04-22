import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { UploadCloud, File, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { useLab } from '@/src/lib/context';
import { api } from '@/src/lib/api';
import { VoiceButton } from '@/src/components/VoiceButton';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    type: '',
    model: '',
    conditions: '',
    timepoints: '',
    researcher: '',
    notes: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { profile, addExperiment } = useLab();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!metadata.name) {
        setMetadata((m) => ({ ...m, name: e.dataTransfer.files[0].name.replace(/\.[^.]+$/, '') }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!metadata.name) {
        setMetadata((m) => ({ ...m, name: e.target.files![0].name.replace(/\.[^.]+$/, '') }));
      }
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

          navigate(`/experiments/${created.id}`);
        } catch (err: any) {
          console.error('Analysis failed:', err);
          setError(err?.message || 'Analysis failed. Check the browser console and server logs.');
        } finally {
          setIsAnalyzing(false);
        }
      },
      error: (err) => {
        console.error('CSV parsing failed:', err);
        setError('Failed to parse the uploaded file. Please ensure it is a valid CSV.');
        setIsAnalyzing(false);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Upload experiment data</h1>
        <p className="text-slate-500">
          Upload a CSV and describe what it is. The AI will produce a narrative, a chart, QC notes,
          and suggested next experiments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Data file</CardTitle>
            <CardDescription>Drop a CSV, TSV, or XLSX export from your instrument here.</CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <UploadCloud className="w-10 h-10 text-slate-400 mb-4" />
                <p className="text-sm font-medium text-slate-700 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500">CSV or TSV (XLSX coming soon)</p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 bg-slate-50">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <File className="w-6 h-6 text-indigo-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Experiment metadata</CardTitle>
            <CardDescription>Tell the model what it's looking at. All fields optional but helpful.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Experiment name</label>
              <input
                type="text"
                placeholder="e.g., Glucose titration — pilot 2"
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={metadata.name}
                onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type / assay</label>
                <input
                  type="text"
                  placeholder="e.g., RT-qPCR, flow, Western"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={metadata.type}
                  onChange={(e) => setMetadata({ ...metadata, type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Model / subject</label>
                <input
                  type="text"
                  placeholder="e.g., HFF cells, C57BL/6 mice"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={metadata.model}
                  onChange={(e) => setMetadata({ ...metadata, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Conditions / treatments</label>
                <input
                  type="text"
                  placeholder="e.g., +/- drug, MOI 1.0"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={metadata.conditions}
                  onChange={(e) => setMetadata({ ...metadata, conditions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Timepoints</label>
                <input
                  type="text"
                  placeholder="e.g., 0, 24, 48 h"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={metadata.timepoints}
                  onChange={(e) => setMetadata({ ...metadata, timepoints: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <VoiceButton
                  compact
                  hint={profile?.focus}
                  label="Dictate notes"
                  onTranscribed={(text) =>
                    setMetadata((m) => ({
                      ...m,
                      notes: m.notes ? `${m.notes.trimEnd()} ${text}` : text,
                    }))
                  }
                />
              </div>
              <textarea
                placeholder="Anything that helps the model interpret this run — protocol deviations, cell passage, known issues."
                className="w-full min-h-[72px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={metadata.notes}
                onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!file || isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing data…
                </span>
              ) : (
                'Run AI analysis'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
