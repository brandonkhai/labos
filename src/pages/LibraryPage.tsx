import React, { useState, useEffect } from 'react';
import {
  FileText, Search, ExternalLink, ChevronDown, ChevronUp, Loader2,
  BookmarkPlus, BookmarkCheck, Trash2, Sparkles, Zap,
} from 'lucide-react';
import { useLab, XP } from '@/src/lib/context';
import { api, type PubmedSummary } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

type View = 'library' | 'search';

export function LibraryPage() {
  const { papers, profile, savePaper, removePaper, awardXP } = useLab();
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PubmedSummary[]>([]);
  const [abstracts, setAbstracts] = useState<Record<string, string>>({});
  const [fetchingAbstract, setFetchingAbstract] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query && profile?.focus) {
      const words = profile.focus.split(/\s+/).slice(0, 5).join(' ');
      setQuery(words);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedPmids = new Set(papers.map((p) => p.pmid).filter(Boolean) as string[]);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    setResults([]);
    setAbstracts({});
    setExpanded(null);
    try {
      const { summaries } = await api.pubmedSearch(query.trim(), 20);
      setResults(summaries);
      setView('search');
      if (summaries.length === 0) setError('No matches. Try different keywords.');
    } catch (err: any) {
      setError(err?.message || 'PubMed search failed.');
    } finally {
      setSearching(false);
    }
  };

  const toggleExpand = async (pmid: string) => {
    const next = expanded === pmid ? null : pmid;
    setExpanded(next);
    if (next && !abstracts[pmid] && !fetchingAbstract[pmid]) {
      setFetchingAbstract((m) => ({ ...m, [pmid]: true }));
      try {
        const { abstracts: got } = await api.pubmedAbstract([pmid]);
        setAbstracts((m) => ({ ...m, ...got }));
      } catch {}
      finally { setFetchingAbstract((m) => ({ ...m, [pmid]: false })); }
    }
  };

  const handleSave = async (s: PubmedSummary) => {
    let abstract = abstracts[s.pmid];
    if (!abstract) {
      try {
        const { abstracts: got } = await api.pubmedAbstract([s.pmid]);
        abstract = got[s.pmid] || '';
      } catch {}
    }
    await savePaper({ pmid: s.pmid, title: s.title, authors: s.authors, journal: s.journal, year: s.year, tags: [], url: s.url, abstract });
    awardXP(XP.PAPER);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">Papers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            Search PubMed & save papers.
            <span className="flex items-center gap-0.5 text-xp-600 font-medium ml-1">
              <Zap className="w-3.5 h-3.5" />+{XP.PAPER} XP per save
            </span>
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          {(['library', 'search'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                view === v
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {v === 'library' ? `Saved (${papers.length})` : 'Search PubMed'}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={runSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Keywords, authors, MeSH terms, DOIs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Search
        </button>
      </form>
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {/* Results / saved list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {view === 'search' ? (
          results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-3">🔬</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Type a query and hit Search to pull live PubMed results.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((s) => {
                const isExpanded = expanded === s.pmid;
                const saved = savedPmids.has(s.pmid);
                return (
                  <div key={s.pmid} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => toggleExpand(s.pmid)}>
                        <FileText className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(s.pmid)}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {s.authors} · {s.journal}{s.year ? ` (${s.year})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => window.open(s.url, '_blank', 'noopener,noreferrer')} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Open on PubMed">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button onClick={() => !saved && handleSave(s)} disabled={saved} className={cn('p-1.5 rounded-lg transition-colors', saved ? 'text-brand-500' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800')} title={saved ? 'Already saved' : 'Save to library'}>
                          {saved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                        </button>
                        <button onClick={() => toggleExpand(s.pmid)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 ml-11 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {fetchingAbstract[s.pmid] ? (
                          <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Fetching abstract…</span>
                        ) : abstracts[s.pmid] ? (
                          <p className="whitespace-pre-wrap">{abstracts[s.pmid]}</p>
                        ) : (
                          <p className="italic text-slate-400">No abstract available.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          papers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-3">📚</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No papers saved yet. Search PubMed and bookmark a few!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {papers.map((p) => {
                const key = p.id || p.pmid || p.title;
                const isExpanded = expanded === key;
                return (
                  <div key={key} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                        <FileText className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{p.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.authors} · {p.journal}{p.year ? ` (${p.year})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.url && (
                          <button onClick={() => window.open(p.url, '_blank', 'noopener,noreferrer')} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removePaper(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setExpanded(isExpanded ? null : key)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (p.abstract || p.summary) && (
                      <div className="mt-3 ml-11 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {p.abstract || p.summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
