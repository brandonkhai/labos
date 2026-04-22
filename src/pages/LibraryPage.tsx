import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  FileText, Search, ExternalLink, ChevronDown, ChevronUp, Loader2,
  BookmarkPlus, BookmarkCheck, Trash2, Sparkles,
} from 'lucide-react';
import { useLab } from '@/src/lib/context';
import { api, type PubmedSummary } from '@/src/lib/api';

type View = 'library' | 'search';

export function LibraryPage() {
  const { papers, profile, savePaper, removePaper } = useLab();
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PubmedSummary[]>([]);
  const [abstracts, setAbstracts] = useState<Record<string, string>>({});
  const [fetchingAbstract, setFetchingAbstract] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Auto-prefill the search box with the lab focus on first mount.
  useEffect(() => {
    if (!query && profile?.focus) {
      // Use first few words of focus as a reasonable default query.
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
      if (summaries.length === 0) {
        setError('No matches found. Try different keywords.');
      }
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
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingAbstract((m) => ({ ...m, [pmid]: false }));
      }
    }
  };

  const handleSave = async (s: PubmedSummary) => {
    // Fetch the abstract too so saved papers are useful offline.
    let abstract = abstracts[s.pmid];
    if (!abstract) {
      try {
        const { abstracts: got } = await api.pubmedAbstract([s.pmid]);
        abstract = got[s.pmid] || '';
      } catch { /* non-fatal */ }
    }
    await savePaper({
      pmid: s.pmid,
      title: s.title,
      authors: s.authors,
      journal: s.journal,
      year: s.year,
      tags: [],
      url: s.url,
      abstract,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lab library</h1>
          <p className="text-slate-500">
            Search PubMed directly and save papers to {profile?.name || 'the lab'}'s library.
          </p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setView('library')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Saved ({papers.length})
          </button>
          <button
            onClick={() => setView('search')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Search PubMed
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <form onSubmit={runSearch} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search PubMed — keywords, authors, MeSH terms, DOIs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              disabled={searching || !query.trim()}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Search
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {view === 'search' ? (
            <SearchResults
              results={results}
              expanded={expanded}
              abstracts={abstracts}
              fetchingAbstract={fetchingAbstract}
              savedPmids={savedPmids}
              onExpand={toggleExpand}
              onSave={handleSave}
            />
          ) : (
            <SavedList
              papers={papers}
              onRemove={removePaper}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SearchResults({
  results,
  expanded,
  abstracts,
  fetchingAbstract,
  savedPmids,
  onExpand,
  onSave,
}: {
  results: PubmedSummary[];
  expanded: string | null;
  abstracts: Record<string, string>;
  fetchingAbstract: Record<string, boolean>;
  savedPmids: Set<string>;
  onExpand: (pmid: string) => void;
  onSave: (s: PubmedSummary) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Type a query and hit search to pull live results from PubMed.
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {results.map((s) => {
        const isExpanded = expanded === s.pmid;
        const saved = savedPmids.has(s.pmid);
        return (
          <div key={s.pmid} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => onExpand(s.pmid)}>
                <div className="bg-slate-100 p-2 rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900">{s.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {s.authors} • {s.journal}
                    {s.year ? ` (${s.year})` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PMID {s.pmid}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-indigo-600"
                  onClick={() => window.open(s.url, '_blank', 'noopener,noreferrer')}
                  title="Open on PubMed"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={saved ? 'text-emerald-600' : 'text-slate-400 hover:text-indigo-600'}
                  onClick={() => !saved && onSave(s)}
                  disabled={saved}
                  title={saved ? 'Already saved' : 'Save to library'}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400"
                  onClick={() => onExpand(s.pmid)}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="mt-3 pl-14 pr-4 pb-1 text-sm text-slate-700">
                {fetchingAbstract[s.pmid] ? (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching abstract…
                  </span>
                ) : abstracts[s.pmid] ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{abstracts[s.pmid]}</p>
                ) : (
                  <p className="text-slate-400 italic">No abstract available.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SavedList({
  papers,
  onRemove,
  expanded,
  setExpanded,
}: {
  papers: ReturnType<typeof useLab>['papers'];
  onRemove: (id: string) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  if (papers.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No papers saved yet. Switch to <span className="font-medium">Search PubMed</span> and bookmark a few.
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {papers.map((p) => {
        const key = p.id || p.pmid || p.title;
        const isExpanded = expanded === key;
        return (
          <div key={key} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex items-start gap-4 min-w-0 flex-1 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : key)}
              >
                <div className="bg-slate-100 p-2 rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900">{p.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {p.authors} • {p.journal}
                    {p.year ? ` (${p.year})` : ''}
                  </p>
                  {p.pmid && <p className="text-xs text-slate-400 mt-1">PMID {p.pmid}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-indigo-600"
                    onClick={() => window.open(p.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {isExpanded && (p.abstract || p.summary) && (
              <div className="mt-3 pl-14 pr-4 pb-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {p.abstract || p.summary}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
