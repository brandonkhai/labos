import React from 'react';
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
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLab } from '@/src/lib/context';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile } = useLab();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Notebook', path: '/notebook', icon: NotebookPen },
    { name: 'Experiments', path: '/experiments', icon: Beaker },
    { name: 'Upload Data', path: '/upload', icon: Upload },
    { name: 'Hypotheses', path: '/hypotheses', icon: Lightbulb },
    { name: 'Library', path: '/library', icon: Library },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight text-slate-900 truncate" title={profile?.name || 'LabOS'}>
            {profile?.name || 'LabOS'}
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full transition-colors">
            <Settings className="w-4 h-4 text-slate-400" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 hover:text-slate-900">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-medium text-slate-800">
              {navItems.find(item => item.path === location.pathname)?.name || 'LabOS'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm">
              BN
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
