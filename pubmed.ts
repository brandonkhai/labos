/**
 * Real PubMed integration via NCBI E-utilities.
 *
 *   GET  /api/pubmed/search?q=<query>&max=20
 *        → { query, count, ids: [pmid], summaries: [{pmid,title,authors,journal,year,doi,url}] }
 *
 *   POST /api/pubmed/abstract  { pmid } | { pmids: [...] }
 *        → { abstracts: { [pmid]: string } }
 *
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/
 *
 * NCBI_API_KEY is optional; without it NCBI rate-limits to ~3 req/sec.
 * With a key you get ~10 req/sec. Nothing here needs auth to work.
 */

import { Router } from 'express';

export const pubmedRouter = Router();

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

function withKey(url: URL) {
  url.searchParams.set('tool', 'LabOS');
  url.searchParams.set('email', process.env.NCBI_CONTACT_EMAIL || 'labos@example.com');
  if (process.env.NCBI_API_KEY) {
    url.searchParams.set('api_key', process.env.NCBI_API_KEY);
  }
  return url;
}

interface ESummaryAuthor { name: string; authtype: string; }
interface ESummaryArticleId { idtype: string; value: string; }
interface ESummaryRecord {
  uid: string;
  pubdate?: string;
  epubdate?: string;
  source?: string;
  authors?: ESummaryAuthor[];
  title?: string;
  fulljournalname?: string;
  articleids?: ESummaryArticleId[];
}

function parseYear(r: ESummaryRecord): number {
  const d = r.pubdate || r.epubdate || '';
  const m = d.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

function formatAuthors(authors: ESummaryAuthor[] = []): string {
  const names = authors
    .filter((a) => a.authtype === 'Author' || !a.authtype)
    .map((a) => a.name)
    .slice(0, 6);
  if (authors.length > 6) names.push('et al.');
  return names.join(', ');
}

function findId(r: ESummaryRecord, idtype: string): string | undefined {
  return r.articleids?.find((a) => a.idtype === idtype)?.value;
}

pubmedRouter.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const max = Math.min(Number(req.query.max) || 20, 50);
    if (!q) return res.status(400).json({ error: 'Missing query parameter "q".' });

    // 1) ESearch for PMIDs.
    const searchUrl = withKey(new URL(`${EUTILS}/esearch.fcgi`));
    searchUrl.searchParams.set('db', 'pubmed');
    searchUrl.searchParams.set('retmode', 'json');
    searchUrl.searchParams.set('retmax', String(max));
    searchUrl.searchParams.set('sort', 'relevance');
    searchUrl.searchParams.set('term', q);

    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) {
      return res.status(502).json({ error: `PubMed search failed (${searchResp.status})` });
    }
    const searchJson: any = await searchResp.json();
    const ids: string[] = searchJson?.esearchresult?.idlist ?? [];
    const count = Number(searchJson?.esearchresult?.count ?? ids.length);

    if (ids.length === 0) {
      return res.json({ query: q, count: 0, ids: [], summaries: [] });
    }

    // 2) ESummary for titles, authors, journal, year, DOI.
    const summaryUrl = withKey(new URL(`${EUTILS}/esummary.fcgi`));
    summaryUrl.searchParams.set('db', 'pubmed');
    summaryUrl.searchParams.set('retmode', 'json');
    summaryUrl.searchParams.set('id', ids.join(','));

    const summaryResp = await fetch(summaryUrl);
    if (!summaryResp.ok) {
      return res.status(502).json({ error: `PubMed summary failed (${summaryResp.status})` });
    }
    const summaryJson: any = await summaryResp.json();
    const result = summaryJson?.result ?? {};

    const summaries = ids
      .map((id) => result[id] as ESummaryRecord | undefined)
      .filter(Boolean)
      .map((r) => {
        const pmid = r!.uid;
        const doi = findId(r!, 'doi');
        return {
          pmid,
          title: r!.title?.replace(/\.$/, '') ?? '',
          authors: formatAuthors(r!.authors),
          journal: r!.fulljournalname || r!.source || '',
          year: parseYear(r!),
          doi,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        };
      });

    res.json({ query: q, count, ids, summaries });
  } catch (err) {
    next(err);
  }
});

pubmedRouter.post('/abstract', async (req, res, next) => {
  try {
    const pmids: string[] = req.body?.pmids
      ? req.body.pmids
      : req.body?.pmid
        ? [req.body.pmid]
        : [];
    if (pmids.length === 0) {
      return res.status(400).json({ error: 'Provide pmid or pmids in the request body.' });
    }

    const url = withKey(new URL(`${EUTILS}/efetch.fcgi`));
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('rettype', 'abstract');
    url.searchParams.set('retmode', 'xml');
    url.searchParams.set('id', pmids.join(','));

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: `PubMed efetch failed (${resp.status})` });
    }
    const xml = await resp.text();

    // Light XML parse — enough for abstracts without adding a dependency.
    // Each article is wrapped in <PubmedArticle>...</PubmedArticle>.
    const abstracts: Record<string, string> = {};
    const articleBlocks = xml.split(/<PubmedArticle[\s>]/).slice(1);
    for (const block of articleBlocks) {
      const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      if (!pmidMatch) continue;
      const pmid = pmidMatch[1];
      // Concatenate all AbstractText nodes (sometimes split into labeled sections).
      const textNodes = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
      const labels = [...block.matchAll(/<AbstractText(?:\s[^>]*Label="([^"]+)")?[^>]*>/g)];
      if (textNodes.length === 0) {
        abstracts[pmid] = '';
        continue;
      }
      const parts = textNodes.map((m, i) => {
        const raw = m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .trim();
        const label = labels[i]?.[1];
        return label ? `${label}: ${raw}` : raw;
      });
      abstracts[pmid] = parts.filter(Boolean).join('\n\n');
    }

    res.json({ abstracts });
  } catch (err) {
    next(err);
  }
});
