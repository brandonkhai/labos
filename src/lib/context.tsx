import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import type {
  LabProfile,
  SavedPaper,
  Experiment,
  Hypothesis,
  Observation,
} from './api';

// Re-export so existing callers keep compiling.
export type { LabProfile, SavedPaper as Paper, Experiment as Activity, Hypothesis, Observation };

interface LabContextType {
  ready: boolean;
  profile: LabProfile | null;
  papers: SavedPaper[];
  experiments: Experiment[];
  hypotheses: Hypothesis[];
  observations: Observation[];
  setProfile: (profile: LabProfile) => Promise<void>;
  refresh: () => Promise<void>;
  addExperiment: (exp: Partial<Experiment>) => Promise<Experiment>;
  removeExperiment: (id: string) => Promise<void>;
  savePaper: (paper: Partial<SavedPaper>) => Promise<void>;
  removePaper: (id: string) => Promise<void>;
  addHypothesis: (h: Partial<Hypothesis>) => Promise<void>;
  updateHypothesis: (id: string, patch: Partial<Hypothesis>) => Promise<void>;
  removeHypothesis: (id: string) => Promise<void>;
  addObservation: (obs: Partial<Observation>) => Promise<Observation>;
  updateObservation: (id: string, patch: Partial<Observation>) => Promise<void>;
  removeObservation: (id: string) => Promise<void>;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<LabProfile | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  const refresh = useCallback(async () => {
    const [prof, exps, obs] = await Promise.all([
      api.getProfile(),
      api.listExperiments(),
      api.listObservations(),
    ]);
    setProfileState(prof.profile);
    setPapers(prof.papers);
    setHypotheses(prof.hypotheses);
    setExperiments(exps.experiments);
    setObservations(obs.observations);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => {
        console.warn('[LabProvider] initial refresh failed:', err);
      })
      .finally(() => setReady(true));
  }, [refresh]);

  const setProfile = useCallback(async (next: LabProfile) => {
    const { profile: saved } = await api.putProfile(next);
    setProfileState(saved);
  }, []);

  const addExperiment = useCallback(async (exp: Partial<Experiment>) => {
    const { experiment, experiments: all } = await api.createExperiment(exp);
    setExperiments(all);
    return experiment;
  }, []);

  const removeExperiment = useCallback(async (id: string) => {
    const { experiments: all } = await api.deleteExperiment(id);
    setExperiments(all);
  }, []);

  const savePaper = useCallback(async (paper: Partial<SavedPaper>) => {
    const { papers: all } = await api.savePaper(paper);
    setPapers(all);
  }, []);

  const removePaper = useCallback(async (id: string) => {
    const { papers: all } = await api.deletePaper(id);
    setPapers(all);
  }, []);

  const addHypothesis = useCallback(async (h: Partial<Hypothesis>) => {
    const { hypotheses: all } = await api.saveHypothesis(h);
    setHypotheses(all);
  }, []);

  const updateHypothesis = useCallback(async (id: string, patch: Partial<Hypothesis>) => {
    const { hypotheses: all } = await api.updateHypothesis(id, patch);
    setHypotheses(all);
  }, []);

  const removeHypothesis = useCallback(async (id: string) => {
    const { hypotheses: all } = await api.deleteHypothesis(id);
    setHypotheses(all);
  }, []);

  const addObservation = useCallback(async (obs: Partial<Observation>) => {
    const { observation, observations: all } = await api.createObservation(obs);
    setObservations(all);
    return observation;
  }, []);

  const updateObservation = useCallback(async (id: string, patch: Partial<Observation>) => {
    const { observations: all } = await api.updateObservation(id, patch);
    setObservations(all);
  }, []);

  const removeObservation = useCallback(async (id: string) => {
    const { observations: all } = await api.deleteObservation(id);
    setObservations(all);
  }, []);

  const value: LabContextType = {
    ready,
    profile,
    papers,
    experiments,
    hypotheses,
    observations,
    setProfile,
    refresh,
    addExperiment,
    removeExperiment,
    savePaper,
    removePaper,
    addHypothesis,
    updateHypothesis,
    removeHypothesis,
    addObservation,
    updateObservation,
    removeObservation,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const context = useContext(LabContext);
  if (context === undefined) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
}
