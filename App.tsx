/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { UploadPage } from './pages/UploadPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { ExperimentDetail } from './pages/ExperimentDetail';
import { HypothesesPage } from './pages/HypothesesPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotebookPage } from './pages/NotebookPage';
import { SettingsPage } from './pages/SettingsPage';
import { LabProvider, useLab } from './lib/context';
import { Onboarding } from './components/Onboarding';
import { ThemeProvider } from './lib/theme';
import { CommandPalette } from './components/CommandPalette';

function AppContent() {
  const { profile, ready } = useLab();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading workspace…</div>
      </div>
    );
  }

  if (!profile) {
    return <Onboarding />;
  }

  return (
    <Router>
      <CommandPalette />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/experiments" element={<ExperimentsPage />} />
          <Route path="/experiments/:id" element={<ExperimentDetail />} />
          <Route path="/hypotheses" element={<HypothesesPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="p-6 text-slate-500 dark:text-slate-400">Page under construction.</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <LabProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LabProvider>
  );
}
