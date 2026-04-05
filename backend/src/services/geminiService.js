import { GoogleGenerativeAI } from "@google/generative-ai";

/** Prefer env model first, then 2.0 Flash-Lite (fast/cheap), then other fallbacks. */
function getModelCandidates() {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const fallbacks = [
    fromEnv,
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ];
  return [...new Set(fallbacks.filter(Boolean))];
}

function isModelNotFoundError(err) {
  const status = err?.status ?? err?.statusCode;
  const msg = String(err?.message ?? err ?? "");
  return (
    status === 404 ||
    /not found/i.test(msg) ||
    /404/.test(msg)
  );
}

function isRateLimitError(err) {
  const status = err?.status ?? err?.statusCode;
  const msg = String(err?.message ?? err ?? "");
  return (
    status === 429 ||
    /Too Many Requests|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)
  );
}

function parseRetryDelayMs(err) {
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/retry in ([\d.]+)\s*s/i);
  if (m) return Math.min(120_000, Math.ceil(Number(m[1]) * 1000) + 500);
  const jsonMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (jsonMatch) return Math.min(120_000, Number(jsonMatch[1]) * 1000 + 500);
  return 15_000;
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini's `response.text()` throws when there is no text part (safety block, empty, etc.).
 */
function extractTextFromResponse(response) {
  if (!response) return null;
  try {
    const quick = response.text();
    if (quick && String(quick).trim()) return String(quick);
  } catch (e) {
    console.warn("Gemini response.text():", e.message);
  }
  const cand = response.candidates?.[0];
  const parts = cand?.content?.parts;
  if (parts?.length) {
    const joined = parts
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("");
    if (joined.trim()) return joined;
  }
  if (cand?.finishReason) {
    console.warn("Gemini finishReason:", cand.finishReason);
  }
  if (response.promptFeedback) {
    console.warn("Gemini promptFeedback:", response.promptFeedback);
  }
  return null;
}

/**
 * Tries models in order. On 404, tries next model. On 429, waits for API "retry in Xs" then retries once;
 * if still failing, tries next model (separate per-model quotas).
 */
async function generateTextWithModelFallback(genAI, prompt, label) {
  const models = getModelCandidates();
  let lastErr = null;

  for (let i = 0; i < models.length; i++) {
    const modelId = models[i];
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        const text = extractTextFromResponse(result.response);
        if (text) {
          if (i > 0 || attempt > 0) {
            console.info(`[Gemini] ${label}: OK with "${modelId}"`);
          }
          return text;
        }
        console.warn(`[Gemini] (${modelId}) returned no text for ${label}`);
        break;
      } catch (err) {
        lastErr = err;

        if (isModelNotFoundError(err) && i < models.length - 1) {
          console.warn(
            `[Gemini] "${modelId}" not found — trying next model…`
          );
          break;
        }

        if (isRateLimitError(err)) {
          if (attempt < maxAttempts - 1) {
            const waitMs = parseRetryDelayMs(err);
            console.warn(
              `[Gemini] ${label} rate limited (${modelId}). Waiting ~${Math.round(waitMs / 1000)}s (per API), then retry…`
            );
            await sleepMs(waitMs);
            continue;
          }
          if (i < models.length - 1) {
            console.warn(
              `[Gemini] ${label} still over quota on "${modelId}" — trying another model…`
            );
            break;
          }
          console.error(
            `[Gemini] ${label}: quota/rate limit on all models. Check https://ai.google.dev/gemini-api/docs/rate-limits and https://ai.dev/rate-limit — free tier may reset daily or require billing.`
          );
          return null;
        }

        if (isModelNotFoundError(err)) {
          console.error(`[Gemini] ${label} failed on "${modelId}":`, err.message || err);
          return null;
        }

        if (i < models.length - 1) {
          console.warn(
            `[Gemini] ${label} on "${modelId}":`,
            String(err?.message || err).slice(0, 200),
            "— trying next model…"
          );
          break;
        }

        console.error(`[Gemini] ${label} failed on "${modelId}":`, err.message || err);
        return null;
      }
    }
  }

  if (lastErr) {
    console.error(`[Gemini] ${label}: exhausted models and retries`);
  }
  return null;
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeAnalysis(parsed) {
  if (!parsed || typeof parsed !== "object") return null;

  const categories = ["Bug", "Feature Request", "Improvement", "Other"];
  let category = parsed.category;
  if (!categories.includes(category)) category = "Other";

  const sentiments = ["Positive", "Neutral", "Negative"];
  let sentiment = parsed.sentiment;
  if (!sentiments.includes(sentiment)) sentiment = "Neutral";

  let priority_score = Number(parsed.priority_score);
  if (Number.isNaN(priority_score)) priority_score = 5;
  priority_score = Math.min(10, Math.max(1, Math.round(priority_score)));

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 2000)
      : "";

  let tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  tags = tags
    .filter((t) => typeof t === "string" && t.trim())
    .map((t) => t.trim().slice(0, 40))
    .slice(0, 8);

  return {
    category,
    sentiment,
    priority_score,
    summary,
    tags,
  };
}

export async function analyzeFeedback(title, description) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY not set; skipping AI analysis");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);

    const prompt = `Analyse this product feedback. Return ONLY valid JSON with these fields: category, sentiment, priority_score, summary, tags.
Rules:
- category: one of Bug, Feature Request, Improvement, Other
- sentiment: one of Positive, Neutral, Negative
- priority_score: integer 1 (low) to 10 (critical)
- summary: one concise sentence
- tags: array of 2-5 short topic tags

Feedback title: ${title}
Feedback description: ${description}`;

    const text = await generateTextWithModelFallback(
      genAI,
      prompt,
      "analyseFeedback"
    );
    if (!text) return null;
    const parsed = extractJson(text);
    return normalizeAnalysis(parsed);
  } catch (err) {
    console.error("analyzeFeedback API error:", err.message || err);
    return null;
  }
}

export async function summarizeWeeklyThemes(feedbackLines) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const genAI = new GoogleGenerativeAI(key);

    const prompt = `You are summarising product feedback from the last 7 days. Here is a list of items (title — summary):

${feedbackLines}

Return ONLY valid JSON: { "themes": [ "theme1", "theme2", "theme3" ] }
The themes should be the top 3 recurring themes or priorities. Be specific and actionable.`;

    const text = await generateTextWithModelFallback(
      genAI,
      prompt,
      "summarizeWeeklyThemes"
    );
    if (!text) return null;
    const parsed = extractJson(text);
    if (parsed && Array.isArray(parsed.themes)) {
      return parsed.themes
        .filter((t) => typeof t === "string" && t.trim())
        .slice(0, 3);
    }
    return null;
  } catch (err) {
    console.error("summarizeWeeklyThemes API error:", err.message || err);
    return null;
  }
}
