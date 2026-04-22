/**
 * Theme bridge.
 *
 * Reads the `theme` field off the lab profile (light / dark / system) and
 * toggles the `dark` class on <html>. Tailwind 4's `dark:` variants are scoped
 * to that class, so flipping it flips every page.
 *
 * Falls back to "light" if the profile hasn't been created yet. Listens for
 * system-level color-scheme changes when the user chooses "system".
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLab } from './context';

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  resolved: 'light' | 'dark';
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', resolved: 'light' });

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  // Tell the browser so form controls / scrollbars pick the right theme too.
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useLab();
  const theme: Theme = (profile?.theme as Theme | undefined) || 'light';

  const resolved = useMemo<'light' | 'dark'>(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return systemPrefersDark() ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    applyDarkClass(resolved);
  }, [resolved]);

  // Re-apply when the OS theme changes, but only if "system" is selected.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => applyDarkClass(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [theme]);

  return <Ctx.Provider value={{ theme, resolved }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
