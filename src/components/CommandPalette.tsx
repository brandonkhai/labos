/**
 * ⌘K command palette.
 *
 * Fuzzy-ish search across navigation, experiments, observations, and saved
 * papers. No external fuzzy lib — just lowercase substring + a tiny score so
 * title matches rank above body matches.
 *
 * Opening:
 *   - ⌘K / Ctrl+K
 *   - "/" key
 *   - Programmatically via `window.dispatchEvent(new CustomEvent('labos:open-palette'))`
 *
 * Also registers "g" then a nav key (d/n/e/u/h/l/s) as jump shortcuts.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Beaker, BookOpen, Upload, GraduationCap, Library, Home, User,
  FileText, Mic,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { cn } from '@/src/lib/utils';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  group: 'Navigate' | 'Experiments' | 'Notebook' | 'Library';
  haystack: string;
};

const NAV_ITEMS: Omit<Item, 'haystack'>[] = [
  { id: 'nav:/', label: 'Home', icon: Home, path: '/', group: 'Navigate' },
  { id: 'nav:/notes', label: 'Notes', icon: BookOpen, path: '/notes', group: 'Navigate' },
  { id: 'nav:/experiments', label: 'Experiments', icon: Beaker, path: '/experiments', group: 'Navigate' },
  { id: 'nav:/learn', label: 'Learn', icon: GraduationCap, path: '/learn', group: 'Navigate' },
  { id: 'nav:/library', label: 'Papers', icon: Library, path: '/library', group: 'Navigate' },
  { id: 'nav:/profile', label: 'Profile', icon: User, path: '/profile', group: 'Navigate' },
  { id: 'nav:/upload', label: 'New Experiment', icon: Upload, path: '/upload', group: 'Navigate' },
];

function score(item: Item, q: string): number {
  if (!q) return 1; // show everything when empty
  const needle = q.toLowerCase();
  const label = item.label.toLowerCase();
  if (label.includes(needle)) return 10;
  if (item.haystack.includes(needle)) return 3;
  return 0;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { experiments, observations, papers } = useLab();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // --- Build the item index fresh on each open ---
  const items = useMemo<Item[]>(() => {
    const navs: Item[] = NAV_ITEMS.map((n) => ({ ...n, haystack: n.label.toLowerCase() }));
    const expItems: Item[] = experiments.map((e) => ({
      id: `exp:${e.id}`,
      label: e.name || 'Untitled experiment',
      hint: [e.type, e.model, e.date].filter(Boolean).join(' · '),
      icon: Beaker,
      path: `/experiments/${e.id}`,
      group: 'Experiments',
      haystack: [e.name, e.id, e.type, e.model, e.conditions, e.notes, e.researcher]
        .filter(Boolean).join(' ').toLowerCase(),
    }));
    const obsItems: Item[] = observations.slice(0, 200).map((o) => ({
      id: `obs:${o.id}`,
      label: (o.text || '').slice(0, 80) || '(empty observation)',
      hint: new Date(o.createdAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      }),
      icon: Mic,
      path: '/notebook',
      group: 'Notebook',
      haystack: (o.text || '').toLowerCase(),
    }));
    const paperItems: Item[] = papers.map((p) => ({
      id: `paper:${p.id}`,
      label: p.title,
      hint: [p.authors, p.journal, p.year].filter(Boolean).join(' · '),
      icon: FileText,
      path: '/library',
      group: 'Library',
      haystack: [p.title, p.authors, p.journal, p.abstract].filter(Boolean).join(' ').toLowerCase(),
    }));
    return [...navs, ...expItems, ...obsItems, ...paperItems];
  }, [experiments, observations, papers]);

  const filtered = useMemo(() => {
    const scored = items
      .map((i) => ({ item: i, s: score(i, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((x) => x.item);
    return scored;
  }, [items, query]);

  // Reset cursor when query changes
  useEffect(() => { setCursor(0); }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  // ------ Global shortcuts ------
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const openPalette = () => setOpen(true);

    const isTyping = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || t.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K always opens palette, even while typing.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (open) return; // other shortcuts are blocked while palette is up

      if (isTyping(e.target)) return;

      if (e.key === '/') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // "g" then nav letter: d=dashboard, n=notebook, e=experiments,
      // u=upload, h=hypotheses, l=library, s=settings
      if (e.key === 'g' && !gPressed) {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }
      if (gPressed) {
        const map: Record<string, string> = {
          d: '/', n: '/notebook', e: '/experiments', u: '/upload',
          h: '/hypotheses', l: '/library', s: '/settings',
        };
        const dest = map[e.key.toLowerCase()];
        gPressed = false;
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
      }
    };

    const onEvent = () => openPalette();

    window.addEventListener('keydown', onKey);
    window.addEventListener('labos:open-palette', onEvent as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('labos:open-palette', onEvent as EventListener);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [open, navigate]);

  const runItem = (item: Item) => {
    setOpen(false);
    navigate(item.path);
  };

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  let flatIndex = -1;
  const flatOrder: Item[] = [];
  (['Navigate', 'Experiments', 'Notebook', 'Library'] as const).forEach((g) => {
    (grouped[g] || []).forEach((i) => flatOrder.push(i));
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(flatOrder.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = flatOrder[cursor];
      if (pick) runItem(pick);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-slate-950/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search experiments, notes, papers, or jump to a page…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
          {flatOrder.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No matches. Try a different keyword.
            </div>
          ) : (
            (['Navigate', 'Experiments', 'Notebook', 'Library'] as const).map((group) => {
              const list = grouped[group] || [];
              if (list.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group}
                  </div>
                  {list.map((item) => {
                    flatIndex++;
                    const active = flatIndex === cursor;
                    const idx = flatIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => runItem(item)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left text-sm',
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                        )}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{item.label}</p>
                          {item.hint && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.hint}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
          <span><kbd className="font-mono">↑ ↓</kbd> navigate</span>
          <span><kbd className="font-mono">Enter</kbd> open</span>
          <span className="ml-auto"><kbd className="font-mono">g</kbd>+<kbd className="font-mono">n</kbd> notebook · <kbd className="font-mono">g</kbd>+<kbd className="font-mono">e</kbd> experiments</span>
        </div>
      </div>
    </div>
  );
}
