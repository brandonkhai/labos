/**
 * LabOS backend.
 *
 * Stateless API: proxies Gemini and PubMed so the API keys stay off the
 * client. All user data (profile, experiments, notebook, papers) lives in
 * the visitor's own browser via localStorage — see src/lib/localStore.ts.
 *
 * In production the same process also serves the built Vite frontend from
 * dist/, so the whole app is a single Node service (one Render/Railway
 * instance, same-origin, no CORS).
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { pubmedRouter } from './routes/pubmed.js';
import { aiRouter } from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '10mb' }));

// Tiny request log so you can see what the frontend is doing.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    ncbi: Boolean(process.env.NCBI_API_KEY),
  });
});

app.use('/api/pubmed', pubmedRouter);
app.use('/api/ai', aiRouter);

// ---------- Serve the built frontend in production ----------
//
// When NODE_ENV=production we expect `npm run build` to have produced a
// dist/ directory at the project root. Serve those static assets, and
// fall back to index.html for any non-API route so client-side routing
// (React Router) works on direct page loads / refreshes.
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SERVE_FRONTEND = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR);

if (SERVE_FRONTEND) {
  app.use(express.static(DIST_DIR, { maxAge: '1h', index: false }));
  // SPA fallback — anything that didn't match /api/* gets index.html.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Unified error handler so the frontend always gets JSON, never HTML,
// for /api errors. (Must be registered LAST to catch route errors.)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err?.message || 'Internal server error',
    details: err?.details,
  });
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`LabOS backend listening on http://localhost:${PORT}`);
  if (SERVE_FRONTEND) {
    console.log(`  → serving frontend from ${DIST_DIR}`);
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[warn] NODE_ENV=production but dist/ not found. Run `npm run build` first.');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[warn] GEMINI_API_KEY not set — AI routes will 400 until you add it.');
  }
});
