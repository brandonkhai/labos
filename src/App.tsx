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
import { LearnPage } from './pages/LearnPage';
import { TodoPage } from './pages/TodoPage';
import { LabProvider, useLab } from './lib/context';
import { Onboarding } from './components/Onboarding';
import { ThemeProvider } from './lib/theme';
import { CommandPalette } from './components/CommandPalette';

function AppContent() {
  const { profile, ready } = useLab();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
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
          {/* v0.6 routes */}
          <Route path="/notes" element={<NotebookPage />} />
          <Route path="/tasks" element={<TodoPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/profile" element={<SettingsPage />} />
          {/* kept routes */}
          <Route path="/experiments" element={<ExperimentsPage />} />
          <Route path="/experiments/:id" element={<ExperimentDetail />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/library" element={<LibraryPage />} />
          {/* legacy routes still work */}
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/hypotheses" element={<HypothesesPage />} />
          <Route path="*" element={<div className="p-6 text-slate-500 dark:text-slate-400">Page not found.</div>} />
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
