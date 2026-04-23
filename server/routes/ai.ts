/**
 * AI routes — Gemini proxied through the server so the API key stays off the client.
 *
 *   POST /api/ai/search-lab         { name }                  → lab profile
 *   POST /api/ai/analyze-experiment { metadata, rows }        → narrative + chart + flags
 *   POST /api/ai/chat               { messages, context? }    → reply text
 *   POST /api/ai/explain            { text, level }           → explain-at-my-level
 *   POST /api/ai/transcribe         { audioBase64, mimeType } → transcription
 *   POST /api/ai/bullet-summary     { text }                  → bullet array
 *   POST /api/ai/summarize-notebook { entries }               → TL;DR + followups
 */

import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

const MODEL_FAST     = process.env.GEMINI_MODEL_FAST     || 'gemini-2.5-flash';
const MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err: any = new Error('GEMINI_API_KEY is not configured on the server.');
    err.status = 400;
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

// Strip ```json ... ``` fences that models sometimes return.
function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function safeParseJSON(s: string) {
  try {
    return JSON.parse(stripFences(s));
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

/** True when the error is a transient Gemini 503 overload. */
function isOverloaded(err: any): boolean {
  const msg: string = String(err?.message || '');
  return (
    err?.status === 503 ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

/**
 * Retry wrapper with exponential backoff + model fallback.
 *
 * Attempts: 1-3 use MODEL_FAST; attempt 4 switches to MODEL_FALLBACK.
 * Delays between attempts: 800 ms, 1.6 s, 3.2 s.
 * Non-retryable errors (400, 401, etc.) are thrown immediately.
 */
async function withRetry<T>(
  fn: (model: string) => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = attempt === maxAttempts ? MODEL_FALLBACK : MODEL_FAST;
    try {
      return await fn(model);
    } catch (err: any) {
      if (!isOverloaded(err) || attempt === maxAttempts) throw err;
      const delay = Math.pow(2, attempt - 1) * 800;
      console.warn(
        `[ai] Gemini overloaded (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms…`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  /* istanbul ignore next */
  throw new Error('Max retries exceeded');
}

// ---------- /search-lab ----------
aiRouter.post('/search-lab', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Missing "name".' });

    const ai = getClient();
    const prompt = `
You are helping initialize a generic research workspace.
The user typed: "${name}".

If this looks like a real lab/PI/institution, use Google Search to look them up.
If it's too vague or generic, you MAY fabricate plausible placeholders — clearly research-oriented
in nature — but keep the focus field concise and neutral. The user can edit everything later.

Return ONLY a JSON object (no markdown, no backticks) with this shape:
{
  "name": "${name}",
  "focus": "one or two sentences describing the lab's primary research focus",
  "techniques": ["6-10 techniques the lab commonly uses"],
  "digest": "one paragraph summarizing what's exciting in this area right now",
  "suggestedQueries": ["3-5 search strings the user could run to populate their library"]
}`.trim();

    const data = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.3 },
      });
      const parsed = safeParseJSON(response.text || '');
      if (!parsed) throw Object.assign(new Error('Model did not return JSON.'), { status: 502 });
      return parsed;
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------- /analyze-experiment ----------
aiRouter.post('/analyze-experiment', async (req, res, next) => {
  try {
    const { metadata, rows, labFocus } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Provide rows (array of parsed CSV records).' });
    }

    const ai = getClient();
    const prompt = `
You are an expert data analyst helping a researcher understand their experimental results.
Lab focus: ${labFocus || 'general research'}.

Metadata provided by the user:
${JSON.stringify(metadata || {}, null, 2)}

Parsed tabular data (first ${Math.min(50, rows.length)} rows):
${JSON.stringify(rows.slice(0, 50))}

Return ONLY JSON (no prose, no fences) matching exactly:
{
  "narrative": "detailed interpretation, several paragraphs, plain language but technically accurate. Use **bold** markdown for key findings.",
  "chartData": [ /* array of records to plot */ ],
  "chartConfig": {
    "type": "line" | "bar",
    "xAxisKey": "column name for x axis",
    "series": [ { "dataKey": "column name", "name": "Display Name", "color": "#hex" } ]
  },
  "qcFlags": ["short strings noting outliers, normalization concerns, or stats notes"],
  "nextSteps": ["concrete experimental follow-ups the user could run next"]
}

If the data is unclear, still produce your best-effort interpretation and say so in the narrative.`.trim();

    const data = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = safeParseJSON(response.text || '');
      if (!parsed) throw Object.assign(new Error('Model did not return JSON.'), { status: 502 });
      return parsed;
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------- /chat ----------
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const { messages = [], context } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Provide messages array.' });
    }

    const ai = getClient();

    const systemPreamble = `
You are LabOS, a research assistant embedded in a researcher's personal workspace.
You have access to the user's experiments, notes, tasks, saved papers, and profile via the
context block below.

Be rigorous: cite specific details from the data when you can, call out limitations honestly,
and when you rely on general knowledge rather than the user's own data, say so clearly.
Keep replies concise and practical. Use **bold** for key terms when helpful.

Context (their actual workspace data):
${JSON.stringify(context || {}, null, 2)}
`.trim();

    const contents = [
      { role: 'user',  parts: [{ text: systemPreamble }] },
      { role: 'model', parts: [{ text: 'Understood. Ready to help.' }] },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content ?? '') }],
      })),
    ];

    const reply = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { temperature: 0.4 },
      });
      return response.text || '';
    });

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

// ---------- /explain ----------
aiRouter.post('/explain', async (req, res, next) => {
  try {
    const { text, level = 'undergrad' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Provide text to explain.' });

    const ai = getClient();

    const explanation = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: `Explain the following passage at a ${level} level. Stay accurate — don't oversimplify to the point of being wrong. Keep it under 200 words.\n\n"""${text}"""`,
        config: { temperature: 0.3 },
      });
      return response.text || '';
    });

    res.json({ explanation });
  } catch (err) {
    next(err);
  }
});

// ---------- /transcribe ----------
aiRouter.post('/transcribe', async (req, res, next) => {
  try {
    const { audioBase64, mimeType, hint } = req.body || {};
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: 'Provide audioBase64 and mimeType.' });
    }
    if (!/^audio\//i.test(mimeType)) {
      return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
    }

    const ai = getClient();

    const transcription = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Transcribe the following audio verbatim. The speaker is a researcher ' +
                  'dictating a lab observation. Preserve numbers, units (e.g. 37 °C, 10 mg/mL, ' +
                  'MOI 1.0), and scientific terms accurately. Do not summarize — return just the ' +
                  "spoken words. If you can't understand a section, use [unclear]. " +
                  'Output only the transcription, no preamble.' +
                  (hint ? `\n\nHint about the topic: ${hint}` : ''),
              },
              { inlineData: { mimeType, data: audioBase64 } },
            ],
          },
        ],
        config: { temperature: 0.1 },
      });
      return (response.text || '').trim();
    });

    res.json({ text: transcription });
  } catch (err) {
    next(err);
  }
});

// ---------- /bullet-summary ----------
aiRouter.post('/bullet-summary', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Provide text (string).' });
    }

    const ai = getClient();

    const bullets = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: `Summarize the following note as 3 to 5 concise bullet points. Return ONLY a JSON array of strings — no prose, no markdown fences, no extra keys.\n\nExample output: ["Point one.", "Point two.", "Point three."]\n\nNote to summarize:\n${text.slice(0, 2000)}`,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      const raw = safeParseJSON(response.text || '');
      return Array.isArray(raw)
        ? raw.filter((x: any) => typeof x === 'string')
        : Array.isArray(raw?.bullets) ? raw.bullets : [];
    });

    res.json({ bullets: bullets.length ? bullets : ['Could not generate summary.'] });
  } catch (err) {
    next(err);
  }
});

// ---------- /summarize-notebook ----------
aiRouter.post('/summarize-notebook', async (req, res, next) => {
  try {
    const { entries, labFocus } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Provide entries array.' });
    }

    const ai = getClient();
    const transcript = entries
      .map((e: any, i: number) => `[${i + 1}] ${e.createdAt || ''}\n${e.text || ''}`)
      .join('\n\n');

    const data = await withRetry(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: `
You are reviewing a researcher's dictated lab notebook.
Lab focus: ${labFocus || 'general research'}.

Produce a JSON object with:
{
  "summary": "a tight paragraph covering what happened and anything notable",
  "observations": ["bulleted list of concrete observations worth preserving"],
  "openQuestions": ["questions raised but not answered"],
  "suggestedFollowups": ["concrete experimental or analytical next steps"]
}

Notebook entries (oldest first):

${transcript}
`.trim(),
        config: { responseMimeType: 'application/json' },
      });
      const parsed = safeParseJSON(response.text || '');
      if (!parsed) throw Object.assign(new Error('Model did not return JSON.'), { status: 502 });
      return parsed;
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});
