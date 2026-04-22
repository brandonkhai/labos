import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Beaker,
  Upload,
  Library,
  Lightbulb,
  Settings,
  Home,
  Menu,
  NotebookPen,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

/** Get 2-letter initials from a full name, falling back to "?". */
function initialsOf(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile } = useLab();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Notebook', path: '/notebook', icon: NotebookPen },
    { name: 'Experiments', path: '/experiments', icon: Beaker },
    { name: 'Upload Data', path: '/upload', icon: Upload },
    { name: 'Hypotheses', path: '/hypotheses', icon: Lightbulb },
    { name: 'Library', path: '/library', icon: Library },
  ];

  const isSettings = location.pathname === '/settings';
  const initials = initialsOf(profile?.user || profile?.name);

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('labos:open-palette'));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar (off-canvas on small screens) */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1
            className="font-semibold text-lg tracking-tight text-slate-900 dark:text-slate-100 truncate"
            title={profile?.name || 'LabOS'}
          >
            {profile?.name || 'LabOS'}
          </h1>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4',
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500',
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
              isSettings
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
            )}
          >
            <Settings
              className={cn(
                'w-4 h-4',
                isSettings
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500',
              )}
            />
            Settings
          </Link>
        </div>
      </aside>

      {/* Dim layer for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-medium text-slate-800 dark:text-slate-200">
              {isSettings
                ? 'Settings'
                : navItems.find((item) => item.path === location.pathname)?.name || 'LabOS'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openPalette}
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4" />
              <span>Search…</span>
              <kbd className="ml-2 hidden md:inline text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/settings"
              className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-medium text-sm hover:ring-2 hover:ring-indigo-400/60"
              title={profile?.user ? `Signed in as ${profile.user}` : 'Set your name in Settings'}
            >
              {initials}
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
