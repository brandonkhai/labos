/**
 * Thin client for the LabOS backend.
 *
 * - Data methods (profile, papers, hypotheses, experiments, observations)
 *   are persisted to the visitor's own browser via `localStore`, so every
 *   visitor gets an isolated workspace and there's no database to run.
 * - AI and PubMed methods still hit the backend, because they need API keys
 *   that can't be safely exposed to the browser.
 *
 * The public shape is kept async on purpose — if we ever need to swap the
 * local store for a real multi-user backend, no component has to change.
 */

import * as local from './localStore';

export interface PubmedSummary {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi?: string;
  url: string;
}

export interface SavedPaper {
  id: string;
  pmid?: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  tags: string[];
  url?: string;
  abstract?: string;
  summary?: string;
  keyIdeas?: string[];
  savedAt?: string;
}

export interface Experiment {
  id: string;
  name: string;
  type: string;
  status: string;
  date?: string;
  model?: string;
  conditions?: string;
  timepoints?: string;
  notes?: string;
  researcher?: string;
  analysisResult?: any;
  rawDataPreview?: any[];
}

export interface Hypothesis {
  id: string;
  status: 'testing' | 'supported' | 'refuted';
  prediction: string;
  reasoning: string;
  experiments: string[];
  researcher: string;
  date: string;
  aiNote?: string;
}

export interface Observation {
  id: string;
  text: string;
  createdAt: string;
  durationSec?: number;
  source: 'voice' | 'typed';
  experimentId?: string;
  tags?: string[];
}

export interface NotebookSummary {
  summary: string;
  observations: string[];
  openQuestions: string[];
  suggestedFollowups: string[];
}

export interface LabProfile {
  /** Lab name (what shows in the sidebar header). */
  name: string;
  focus: string;
  techniques: string[];
  digest: string;
  createdAt?: string;

  // ---- User (researcher) info, all optional ----
  /** Full name of the person using LabOS. */
  user?: string;
  /** Email address. */
  email?: string;
  /** Role within the lab: student, postdoc, PI, tech, etc. */
  role?: string;
  /** Institution / university. */
  institution?: string;
  /** Principal investigator (if different from `user`). */
  pi?: string;
  /** Appearance preference. */
  theme?: 'light' | 'dark' | 'system';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await resp.text();
  let body: any = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = { error: text }; }
  }
  if (!resp.ok) {
    throw new Error(body?.error || `${resp.status} ${resp.statusText}`);
  }
  return body as T;
}

// Returning from sync localStore through an async shim keeps the public API
// consistent with the previous fetch-based one. Components keep `await`-ing.
async function localAsync<T>(fn: () => T): Promise<T> {
  return fn();
}

export const api = {
  health: () => request<{ ok: boolean; gemini: boolean; ncbi: boolean }>('/api/health'),

  // ----- Lab profile + library + hypotheses (local-only) -----
  getProfile: () => localAsync(() => local.getProfile()),
  putProfile: (profile: LabProfile) => localAsync(() => local.putProfile(profile)),

  savePaper: (paper: Partial<SavedPaper>) => localAsync(() => local.savePaper(paper)),
  deletePaper: (id: string) => localAsync(() => local.deletePaper(id)),

  saveHypothesis: (h: Partial<Hypothesis>) => localAsync(() => local.saveHypothesis(h)),
  updateHypothesis: (id: string, patch: Partial<Hypothesis>) =>
    localAsync(() => local.updateHypothesis(id, patch)),
  deleteHypothesis: (id: string) => localAsync(() => local.deleteHypothesis(id)),

  // ----- Experiments (local-only) -----
  listExperiments: () => localAsync(() => local.listExperiments()),
  getExperiment: (id: string) => localAsync(() => local.getExperiment(id)),
  createExperiment: (exp: Partial<Experiment>) => localAsync(() => local.createExperiment(exp)),
  deleteExperiment: (id: string) => localAsync(() => local.deleteExperiment(id)),

  // ----- Observations (local-only) -----
  listObservations: () => localAsync(() => local.listObservations()),
  createObservation: (obs: Partial<Observation>) => localAsync(() => local.createObservation(obs)),
  updateObservation: (id: string, patch: Partial<Observation>) =>
    localAsync(() => local.updateObservation(id, patch)),
  deleteObservation: (id: string) => localAsync(() => local.deleteObservation(id)),

  // ----- PubMed (server-proxied) -----
  pubmedSearch: (q: string, max = 20) =>
    request<{ query: string; count: number; ids: string[]; summaries: PubmedSummary[] }>(
      `/api/pubmed/search?q=${encodeURIComponent(q)}&max=${max}`,
    ),
  pubmedAbstract: (pmids: string[]) =>
    request<{ abstracts: Record<string, string> }>('/api/pubmed/abstract', {
      method: 'POST',
      body: JSON.stringify({ pmids }),
    }),

  // ----- AI (server-proxied) -----
  searchLab: (name: string) =>
    request<{
      name: string;
      focus: string;
      techniques: string[];
      digest: string;
      suggestedQueries: string[];
    }>('/api/ai/search-lab', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  analyzeExperiment: (payload: { metadata: any; rows: any[]; labFocus?: string }) =>
    request<{
      narrative: string;
      chartData: any[];
      chartConfig: any;
      qcFlags: string[];
      nextSteps: string[];
    }>('/api/ai/analyze-experiment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  chat: (messages: { role: 'user' | 'assistant'; content: string }[], context?: any) =>
    request<{ reply: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, context }),
    }),
  explain: (text: string, level: string) =>
    request<{ explanation: string }>('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ text, level }),
    }),
  transcribe: (payload: { audioBase64: string; mimeType: string; hint?: string }) =>
    request<{ text: string }>('/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  summarizeNotebook: (entries: Observation[], labFocus?: string) =>
    request<NotebookSummary>('/api/ai/summarize-notebook', {
      method: 'POST',
      body: JSON.stringify({ entries, labFocus }),
    }),

  /** Summarize a single note entry as 3–5 bullet points. Uses fast model. */
  bulletSummary: (text: string) =>
    request<{ bullets: string[] }>('/api/ai/bullet-summary', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  /** Nuke the saved workspace (useful for a future "reset" action). */
  clearAll: () => localAsync(() => local.clearAll()),
};
