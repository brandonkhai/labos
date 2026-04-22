# LabOS

An AI research agent for biomedical labs. Upload your experimental data, dictate notebook entries hands-free, search live scientific literature on PubMed, and have a rigorous conversation with a model that has both your lab's data and the relevant papers in context.

## What's in the box

**Frontend** — React + Vite + TypeScript + Tailwind
- Dashboard, Notebook (voice-first), Experiments, Upload, Hypotheses, Library pages
- Onboarding flow: web-search a real lab or set one up by hand
- Upload a CSV → model returns narrative, chart, QC flags, next steps
- Live PubMed search with saveable, abstract-backed library
- Per-experiment "Ask LabOS" chat that ingests your data + saved papers as context
- Voice dictation on the Notebook page and inline in chat / notes — transcribed server-side, only the text is stored
- All your data (profile, experiments, notebook entries, saved papers, hypotheses) lives in **your own browser** via `localStorage`

**Backend** — Stateless Express proxy
- Gemini calls (analysis, chat, explain, transcribe, summarize) proxied so your API key never reaches the browser
- Real PubMed integration via NCBI E-utilities (ESearch / ESummary / EFetch)
- Health endpoint at `/api/health`
- In production, the same process also serves the built frontend — one service, one URL

## Running locally

**Prerequisites:** Node 20+.

```bash
npm install
cp .env.example .env
# edit .env — at minimum set GEMINI_API_KEY
npm run dev
```

That starts:
- Frontend on http://localhost:3000
- Backend on http://localhost:8787

The Vite dev server proxies `/api/*` to the backend, so you only ever hit one port from the browser.

## Deploying to Render (one URL to share)

The repo ships with a `render.yaml` blueprint — connect your GitHub fork to Render and you get a live URL in a few minutes.

1. **Push this project to GitHub** (a private repo is fine).
2. Go to [render.com](https://render.com) and sign in with GitHub.
3. Click **New → Blueprint**, pick this repo, and confirm. Render reads `render.yaml` and proposes a single `labos` web service on the free plan.
4. In the service's **Environment** tab, add:
   - `GEMINI_API_KEY` — required. Get one at https://aistudio.google.com/apikey.
   - `NCBI_API_KEY` — optional, ~10x higher PubMed rate limits.
   - `NCBI_CONTACT_EMAIL` — optional; NCBI asks callers to identify themselves.
5. Render will run `npm install && npm run build`, then `npm run start`. The Express server serves both the API and the built React app on the same port (same-origin, no CORS).
6. Open the URL Render gives you (something like `https://labos.onrender.com`). Share it with whoever you want.

**Heads up on the free plan:** Render spins the service down after ~15 minutes of inactivity, so the first request after a break takes 30–60 seconds to wake it up. Subsequent requests are fast. Upgrade to a paid instance ($7/mo as of 2026) if you need it always-on.

**Voice note:** `getUserMedia` requires HTTPS or `localhost`. Render gives you HTTPS out of the box, so dictation Just Works on the deployed URL.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Get one at https://aistudio.google.com/apikey |
| `NCBI_API_KEY` | no | Raises your PubMed rate limit from ~3 req/s to ~10 req/s |
| `NCBI_CONTACT_EMAIL` | no, but kind | NCBI asks callers to identify themselves |
| `PORT` | no | Backend port (default 8787; Render sets this automatically) |
| `NODE_ENV` | no | Set to `production` to also serve the built frontend from Express |
| `GEMINI_MODEL_FAST` | no | Defaults to `gemini-2.5-flash` |
| `GEMINI_MODEL_THOUGHTFUL` | no | Defaults to `gemini-2.5-pro` |

## API surface (backend)

The backend is a stateless proxy. All user data lives client-side.

```
GET  /api/health
GET  /api/pubmed/search?q=<query>&max=20
POST /api/pubmed/abstract           { pmids: [...] }
POST /api/ai/search-lab             { name }
POST /api/ai/analyze-experiment     { metadata, rows, labFocus? }
POST /api/ai/chat                   { messages, context? }
POST /api/ai/explain                { text, level }
POST /api/ai/transcribe             { audioBase64, mimeType, hint? }
POST /api/ai/summarize-notebook     { entries, labFocus? }
```

## Persistence

Each visitor's workspace (profile, papers, hypotheses, experiments, notebook entries) lives in `localStorage` under the key `labos.v1` in their own browser. Clearing browser data wipes the workspace; each person who opens the URL gets their own empty sandbox.

If you ever want real multi-user data with accounts, the persistence layer is isolated behind a single file — `src/lib/localStore.ts` — and every component talks to it through `api.ts`. Swap `localStore` for a fetch to a real backend and nothing else has to change.

## Roadmap (from the pitch)

- [x] Real PubMed integration (search, summary, abstract)
- [x] Server-side Gemini (API keys off client)
- [x] Conversational "Ask LabOS" per experiment with data + papers context
- [x] Voice input for hands-free note-taking during experiments (Gemini audio → transcription)
- [x] AI notebook summary with followups
- [x] One-service deploy to Render
- [ ] Vector database for semantic search over saved papers + past analyses (Chroma or pgvector)
- [ ] Multi-step agent loop (plan → retrieve → reason → report)
- [ ] Multi-model support (Claude, ChatGPT) behind the same backend abstraction
- [ ] Real multi-user auth + shared team libraries
