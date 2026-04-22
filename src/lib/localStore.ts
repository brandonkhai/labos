/**
 * Client-side persistence layer.
 *
 * All notebook/experiment/paper data lives in the visitor's own browser via
 * localStorage — no backend database. This keeps the app trivial to deploy
 * (one stateless Node service) and means each user's data is isolated from
 * every other visitor by default.
 *
 * The return shapes mirror what the old Express data routes returned, so
 * `api.ts` can keep the same public contract for the React components.
 */

import type {
  LabProfile,
  SavedPaper,
  Experiment,
  Hypothesis,
  Observation,
} from './api';

const STORAGE_KEY = 'labos.v1';

interface AppState {
  profile: LabProfile | null;
  papers: SavedPaper[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  observations: Observation[];
}

const EMPTY: AppState = {
  profile: null,
  papers: [],
  hypotheses: [],
  experiments: [],
  observations: [],
};

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function load(): AppState {
  if (!canUseStorage()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return {
      profile: parsed.profile ?? null,
      papers: Array.isArray(parsed.papers) ? parsed.papers : [],
      hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses : [],
      experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
    };
  } catch (err) {
    console.warn('[localStore] failed to parse, starting fresh:', err);
    return { ...EMPTY };
  }
}

function save(state: AppState): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[localStore] failed to save:', err);
  }
}

function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Newest-first helper for list returns.
function byCreatedDesc<T extends { createdAt?: string; savedAt?: string; date?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ak = a.createdAt || a.savedAt || a.date || '';
    const bk = b.createdAt || b.savedAt || b.date || '';
    return bk.localeCompare(ak);
  });
}

// ---------- Profile ----------

export function getProfile(): { profile: LabProfile | null; papers: SavedPaper[]; hypotheses: Hypothesis[] } {
  const s = load();
  return { profile: s.profile, papers: s.papers, hypotheses: s.hypotheses };
}

export function putProfile(profile: LabProfile): { profile: LabProfile } {
  const s = load();
  const saved: LabProfile = {
    ...profile,
    createdAt: s.profile?.createdAt || nowIso(),
  };
  save({ ...s, profile: saved });
  return { profile: saved };
}

// ---------- Papers ----------

export function savePaper(input: Partial<SavedPaper>): { papers: SavedPaper[] } {
  const s = load();
  // Dedup by pmid or title+year if pmid missing.
  const key = (p: Partial<SavedPaper>) => (p.pmid ? `pmid:${p.pmid}` : `t:${(p.title || '').toLowerCase()}|${p.year || ''}`);
  const inputKey = key(input);
  const existing = s.papers.findIndex((p) => key(p) === inputKey);
  const paper: SavedPaper = {
    id: input.id || genId('PAPER'),
    pmid: input.pmid,
    title: input.title || '',
    authors: input.authors || '',
    journal: input.journal || '',
    year: input.year || new Date().getFullYear(),
    tags: input.tags || [],
    url: input.url,
    abstract: input.abstract,
    summary: input.summary,
    keyIdeas: input.keyIdeas,
    savedAt: input.savedAt || nowIso(),
  };
  let papers: SavedPaper[];
  if (existing >= 0) {
    papers = [...s.papers];
    papers[existing] = { ...papers[existing], ...paper, id: papers[existing].id };
  } else {
    papers = [paper, ...s.papers];
  }
  save({ ...s, papers });
  return { papers };
}

export function deletePaper(id: string): { papers: SavedPaper[] } {
  const s = load();
  const papers = s.papers.filter((p) => p.id !== id);
  save({ ...s, papers });
  return { papers };
}

// ---------- Hypotheses ----------

export function saveHypothesis(input: Partial<Hypothesis>): { hypotheses: Hypothesis[] } {
  const s = load();
  const h: Hypothesis = {
    id: input.id || genId('HYP'),
    status: (input.status as Hypothesis['status']) || 'testing',
    prediction: input.prediction || '',
    reasoning: input.reasoning || '',
    experiments: input.experiments || [],
    researcher: input.researcher || s.profile?.name || 'you',
    date: input.date || new Date().toLocaleDateString(),
    aiNote: input.aiNote,
  };
  const hypotheses = [h, ...s.hypotheses];
  save({ ...s, hypotheses });
  return { hypotheses };
}

export function updateHypothesis(id: string, patch: Partial<Hypothesis>): { hypotheses: Hypothesis[] } {
  const s = load();
  const hypotheses = s.hypotheses.map((h) => (h.id === id ? { ...h, ...patch, id: h.id } : h));
  save({ ...s, hypotheses });
  return { hypotheses };
}

export function deleteHypothesis(id: string): { hypotheses: Hypothesis[] } {
  const s = load();
  const hypotheses = s.hypotheses.filter((h) => h.id !== id);
  save({ ...s, hypotheses });
  return { hypotheses };
}

// ---------- Experiments ----------

export function listExperiments(): { experiments: Experiment[] } {
  const s = load();
  return { experiments: byCreatedDesc(s.experiments as any) as Experiment[] };
}

export function getExperiment(id: string): { experiment: Experiment } {
  const s = load();
  const experiment = s.experiments.find((e) => e.id === id);
  if (!experiment) {
    const err: any = new Error(`Experiment ${id} not found`);
    err.status = 404;
    throw err;
  }
  return { experiment };
}

export function createExperiment(input: Partial<Experiment>): { experiment: Experiment; experiments: Experiment[] } {
  const s = load();
  const experiment: Experiment = {
    id: input.id || genId('EXP'),
    name: input.name || 'Untitled experiment',
    type: input.type || 'Experiment',
    status: input.status || 'Analyzed',
    date: input.date || new Date().toLocaleDateString(),
    model: input.model,
    conditions: input.conditions,
    timepoints: input.timepoints,
    notes: input.notes,
    researcher: input.researcher,
    analysisResult: input.analysisResult,
    rawDataPreview: input.rawDataPreview,
  };
  const experiments = [experiment, ...s.experiments];
  save({ ...s, experiments });
  return { experiment, experiments };
}

export function deleteExperiment(id: string): { experiments: Experiment[] } {
  const s = load();
  const experiments = s.experiments.filter((e) => e.id !== id);
  save({ ...s, experiments });
  return { experiments };
}

// ---------- Observations ----------

export function listObservations(): { observations: Observation[] } {
  const s = load();
  // Observations are timestamped; sort newest-first for the notebook feed.
  const observations = [...s.observations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { observations };
}

export function createObservation(input: Partial<Observation>): { observation: Observation; observations: Observation[] } {
  const s = load();
  const observation: Observation = {
    id: input.id || genId('OBS'),
    text: (input.text || '').trim(),
    createdAt: input.createdAt || nowIso(),
    durationSec: input.durationSec,
    source: (input.source as Observation['source']) || 'typed',
    experimentId: input.experimentId,
    tags: input.tags,
  };
  const observations = [observation, ...s.observations];
  save({ ...s, observations });
  return { observation, observations };
}

export function updateObservation(id: string, patch: Partial<Observation>): { observations: Observation[] } {
  const s = load();
  const observations = s.observations.map((o) => (o.id === id ? { ...o, ...patch, id: o.id } : o));
  save({ ...s, observations });
  return { observations };
}

export function deleteObservation(id: string): { observations: Observation[] } {
  const s = load();
  const observations = s.observations.filter((o) => o.id !== id);
  save({ ...s, observations });
  return { observations };
}

// ---------- Utility ----------

/** Exposed so a "reset workspace" button can nuke the saved state later. */
export function clearAll(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
