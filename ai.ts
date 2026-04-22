/**
 * AI routes — Gemini proxied through the server so the API key stays off the client.
 *
 *   POST /api/ai/search-lab         { name }                  → lab profile
 *   POST /api/ai/analyze-experiment { metadata, rows }        → narrative + chart + flags
 *   POST /api/ai/chat               { messages, context? }    → reply text
 *   POST /api/ai/explain            { text, level }           → explain-at-my-level
 *   POST /api/ai/transcribe         { audioBase64, mimeType } → transcription
 *   POST /api/ai/summarize-notebook { entries }               → TL;DR + followups
 */

import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

// gemini-3 doesn't exist yet (the scaffold had "gemini-3-flash-preview" which is bogus).
// Using 2.5-flash for speed/cost and 2.5-pro only where reasoning quality matters.
const MODEL_FAST = process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash';
const MODEL_THOUGHTFUL = process.env.GEMINI_MODEL_THOUGHTFUL || 'gemini-2.5-pro';

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
    // Try grabbing the first {...} block as a fallback.
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

// ---------- /search-lab ----------
aiRouter.post('/search-lab', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Missing "name".' });

    const ai = getClient();
    const prompt = `
You are helping initialize a generic biomedical research workspace for a lab.
The user typed: "${name}".

If this looks like a real lab/PI/institution, use Google Search to look them up.
If it's too vague or generic, you MAY fabricate plausible placeholders — clearly biomedical
in nature — but keep the focus field concise and neutral. The user can edit everything later.

Return ONLY a JSON object (no markdown, no backticks) with this shape:
{
  "name": "${name}",
  "focus": "one or two sentences describing the lab's primary research focus",
  "techniques": ["6-10 techniques the lab commonly uses"],
  "digest": "one paragraph summarizing what's exciting in this area right now",
  "suggestedQueries": ["3-5 PubMed search strings the user could run to populate their library"]
}`.trim();

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    const text = response.text || '';
    const data = safeParseJSON(text);
    if (!data) {
      return res.status(502).json({ error: 'Model did not return JSON.', raw: text });
    }
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
You are an expert biomedical data analyst.
Lab focus: ${labFocus || 'general biomedical research'}.

Metadata provided by the user:
${JSON.stringify(metadata || {}, null, 2)}

Parsed tabular data (first ${Math.min(50, rows.length)} rows):
${JSON.stringify(rows.slice(0, 50))}

Return ONLY JSON (no prose, no fences) matching exactly:
{
  "narrative": "detailed biological interpretation, several paragraphs, plain language but technically accurate. Use **bold** markdown for key findings.",
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

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const data = safeParseJSON(response.text || '');
    if (!data) {
      return res.status(502).json({ error: 'Model did not return JSON.', raw: response.text });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------- /chat ----------
// Simple Q&A over the user's lab context. Client sends a list of messages
// ({role, content}) plus optional context (experiment analyses, papers).
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const { messages = [], context } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Provide messages array.' });
    }

    const ai = getClient();

    const systemPreamble = `
You are LabOS, a research assistant for a biomedical lab. You have access
to the user's recent experiments, saved papers, and lab profile via the
context block below. Be rigorous: cite specific numbers from the data
when you can, call out limitations honestly, and when you rely on
general biomedical knowledge make that clear rather than pretending it
came from the lab's own data.

When asked to explain things, match the user's apparent level — a
first-year trainee and a senior PI need different phrasings.

Context:
${JSON.stringify(context || {}, null, 2)}
`.trim();

    // @google/genai takes contents as an array of { role, parts }.
    const contents = [
      { role: 'user', parts: [{ text: systemPreamble }] },
      { role: 'model', parts: [{ text: 'Understood. Ready to help with the lab.' }] },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content ?? '') }],
      })),
    ];

    const response = await ai.models.generateContent({
      model: MODEL_THOUGHTFUL,
      contents,
      config: { temperature: 0.4 },
    });

    res.json({ reply: response.text || '' });
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
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Explain the following passage at a ${level} level. Stay accurate — don't oversimplify to the point of being wrong. Keep it under 200 words.\n\n"""${text}"""`,
      config: { temperature: 0.3 },
    });
    res.json({ explanation: response.text || '' });
  } catch (err) {
    next(err);
  }
});

// ---------- /transcribe ----------
// Accepts { audioBase64, mimeType } (JSON). Body limit is 10mb (see index.ts).
// Most browsers record audio/webm;codecs=opus; Safari records audio/mp4.
// Gemini accepts both directly as inlineData parts.
aiRouter.post('/transcribe', async (req, res, next) => {
  try {
    const { audioBase64, mimeType, hint } = req.body || {};
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: 'Provide audioBase64 and mimeType.' });
    }
    // Reject anything that isn't audio — avoids accidental file uploads.
    if (!/^audio\//i.test(mimeType)) {
      return res.status(400).json({ error: `Unsupported mimeType: ${mimeType}` });
    }

    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Transcribe the following audio verbatim. The speaker is a ' +
                'biomedical researcher dictating a lab observation. Preserve ' +
                'numbers, units (e.g. 37 °C, 10 mg/mL, MOI 1.0), and scientific ' +
                'terms accurately. Spell out things that sound like abbreviations ' +
                'only if the meaning is unambiguous. Do not summarize — return ' +
                "just the spoken words. If you can't understand a section, use " +
                '[unclear]. Output only the transcription, no preamble.' +
                (hint ? `\n\nHint about the topic: ${hint}` : ''),
            },
            { inlineData: { mimeType, data: audioBase64 } },
          ],
        },
      ],
      config: { temperature: 0.1 },
    });

    res.json({ text: (response.text || '').trim() });
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
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `
You are reviewing a biomedical researcher's dictated lab notebook.
Lab focus: ${labFocus || 'general biomedical research'}.

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

    const data = safeParseJSON(response.text || '');
    if (!data) return res.status(502).json({ error: 'Model did not return JSON.', raw: response.text });
    res.json(data);
  } catch (err) {
    next(err);
  }
});
