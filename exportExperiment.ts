/**
 * Client-side export helpers.
 *
 * - JSON: trivial serialize + download.
 * - PDF: open a print-friendly HTML view in a new tab and trigger the browser's
 *   print dialog, where the user can "Save as PDF". This avoids pulling in a
 *   PDF-rendering library and keeps the bundle small.
 */

import type { Experiment, Observation } from './api';

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  return (name || 'experiment')
    .replace(/[^a-z0-9\-_. ]+/gi, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

// ---------- JSON ----------

export function exportExperimentJson(exp: Experiment, relatedObs: Observation[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = {
    exportedAt: new Date().toISOString(),
    experiment: exp,
    observations: relatedObs,
  };
  download(
    `${safeFilename(exp.name)}-${stamp}.json`,
    'application/json',
    JSON.stringify(payload, null, 2),
  );
}

// ---------- PDF (via print) ----------

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(s: any): string {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

export function exportExperimentPdf(
  exp: Experiment,
  relatedObs: Observation[],
  opts: { labName?: string; user?: string } = {},
) {
  const analysis = exp.analysisResult || {};
  const meta: [string, string][] = ([
    ['Type', exp.type],
    ['Model / subject', exp.model || ''],
    ['Conditions', exp.conditions || ''],
    ['Timepoints', exp.timepoints || ''],
    ['Date', exp.date || ''],
    ['Researcher', exp.researcher || opts.user || ''],
    ['Status', exp.status],
  ] as [string, string][]).filter(([, v]) => v);

  const qcItems: string[] = Array.isArray(analysis.qcFlags) ? analysis.qcFlags : [];
  const nextSteps: string[] = Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [];

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(exp.name)} — LabOS export</title>
  <style>
    @page { size: letter; margin: 0.8in; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #0f172a; line-height: 1.45; font-size: 11pt; }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #334155; }
    .meta { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 12px 0 20px; font-size: 10.5pt; }
    .grid dt { color: #64748b; }
    .grid dd { margin: 0; color: #0f172a; }
    .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #e0e7ff; color: #3730a3; font-size: 9pt; font-weight: 600; }
    .narrative { white-space: pre-wrap; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    .obs { margin: 10px 0; padding: 10px 12px; background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 4px; font-size: 10.5pt; }
    .obs .when { font-size: 9pt; color: #64748b; margin-bottom: 3px; }
    .footer { margin-top: 32px; color: #94a3b8; font-size: 9pt; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <header>
    <div class="meta">${escapeHtml(opts.labName || 'LabOS')}${opts.user ? ' · ' + escapeHtml(opts.user) : ''}</div>
    <h1>${escapeHtml(exp.name || 'Untitled experiment')}</h1>
    <div class="meta">
      <span class="badge">${escapeHtml(exp.status || '')}</span>
      ${exp.id ? ' · ID ' + escapeHtml(exp.id) : ''}
    </div>
  </header>

  ${meta.length > 0 ? `<h2>Metadata</h2>
  <dl class="grid">
    ${meta.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}
  </dl>` : ''}

  ${exp.notes ? `<h2>Notes</h2><div class="narrative">${nl2br(exp.notes)}</div>` : ''}

  ${analysis.narrative ? `<h2>AI analysis</h2><div class="narrative">${nl2br(analysis.narrative)}</div>` : ''}

  ${qcItems.length > 0 ? `<h2>QC &amp; statistical flags</h2>
  <ul>${qcItems.map((x) => `<li>${nl2br(x)}</li>`).join('')}</ul>` : ''}

  ${nextSteps.length > 0 ? `<h2>Suggested next steps</h2>
  <ul>${nextSteps.map((x) => `<li>${nl2br(x)}</li>`).join('')}</ul>` : ''}

  ${relatedObs.length > 0 ? `<h2>Linked notebook entries</h2>
  ${relatedObs.map((o) => `<div class="obs">
    <div class="when">${escapeHtml(new Date(o.createdAt).toLocaleString())} · ${escapeHtml(o.source)}</div>
    <div>${nl2br(o.text)}</div>
  </div>`).join('')}` : ''}

  <div class="footer">
    Exported ${new Date().toLocaleString()} · ${escapeHtml(opts.labName || 'LabOS')}
  </div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 120));
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!w) {
    alert('Pop-ups are blocked. Allow pop-ups for this site to export a PDF.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
