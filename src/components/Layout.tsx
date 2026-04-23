import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, Beaker, CheckSquare, User, Library, Menu, Search, X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

function initialsOf(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_ITEMS = [
  { name: 'Home',        path: '/',            icon: Home,           color: 'text-brand-600' },
  { name: 'Notes',       path: '/notes',        icon: BookOpen,       color: 'text-sky-500' },
  { name: 'Experiments', path: '/experiments',  icon: Beaker,         color: 'text-coral-500' },
  { name: 'Tasks',       path: '/tasks',        icon: CheckSquare,    color: 'text-learn-500' },
  { name: 'Papers',      path: '/library',      icon: Library,        color: 'text-sky-500' },
  { name: 'Profile',     path: '/profile',      icon: User,           color: 'text-slate-500' },
];

function isActive(path: string, current: string): boolean {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile } = useLab();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = initialsOf(profile?.user || profile?.name);

  const openPalette = () => window.dispatchEvent(new CustomEvent('labos:open-palette'));

  const pageTitle = NAV_ITEMS.find((item) => isActive(item.path, location.pathname))?.name
    ?? (location.pathname.startsWith('/experiments/') ? 'Experiment'
      : location.pathname === '/learn' ? 'Tasks'
      : 'LabOS');

  return (
    <div className="flex h-screen bg-brand-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">

      {/* ── Desktop Sidebar ───────────────────────────── */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-brand-500 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-800 text-base leading-tight text-slate-900 dark:text-slate-100 truncate">
              LabOS
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {profile?.name || 'My workspace'}
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path, location.pathname);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    active ? 'text-white' : item.color,
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Dim overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ──────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top header */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 gap-3 shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mr-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h2 className="font-display font-800 text-slate-800 dark:text-slate-200 text-base">
            {pageTitle}
          </h2>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <button
              onClick={openPalette}
              className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Search…</span>
              <kbd className="ml-1 hidden md:inline text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>

            {/* Avatar */}
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-sm hover:ring-2 hover:ring-brand-400/60 transition-all"
              title="Profile"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 pb-24 lg:pb-6">
          <div className="max-w-5xl mx-auto">{children}</div>
        </div>

        {/* ── Bottom tab bar (mobile only) ─────────────── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-20">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path, location.pathname);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
                  active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500',
                )}
              >
                <item.icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
                <span className="text-[10px] font-semibold">{item.name}</span>
                {active && <div className="w-1 h-1 rounded-full bg-brand-500" />}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
