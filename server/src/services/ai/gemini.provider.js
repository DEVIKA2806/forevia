const { AiError } = require("./errors");

// The only provider-specific string we ever look for in an error body.
// Google reports a bad/revoked key as HTTP 400 (not 401), so the status
// alone can't tell "bad key" apart from "bad request".
const INVALID_KEY_MARKER = "API_KEY_INVALID";

/**
 * Google Gemini API adapter (generateContent), using Node's built-in
 * fetch (no SDK dependency). Same contract as every adapter:
 *
 *   generate({ system, prompt, maxTokens }, config) -> Promise<string>
 *
 * The API key is sent only in the x-goog-api-key request header, from the
 * server. It is never put in the URL, so it can't leak into logs.
 */
async function generate({ system, prompt, maxTokens }, config) {
  const model = encodeURIComponent(config.model.replace(/^models\//, ""));
  const url = `${config.baseUrl}/v1beta/models/${model}:generateContent`;

  const generationConfig = {
    // On Gemini 3 models, "thinking" tokens count toward this limit too.
    maxOutputTokens: maxTokens || config.maxOutputTokens,
    // Ask for raw JSON (no markdown fences). The insights service still
    // validates and cleans the result exactly as before.
    responseMimeType: "application/json",
  };
  if (config.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: config.thinkingLevel };
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    if (error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AiError("ai_timeout");
    }
    throw new AiError("ai_unavailable");
  }

  if (!response.ok) {
    console.error("Gemini HTTP status:", response.status);
    // Status decides the outcome. The body is only checked for the single
    // marker above; it is never logged, stored or attached to the error.
    if (response.status === 401 || response.status === 403) throw new AiError("ai_auth");
    if (response.status === 429 || response.status === 503) throw new AiError("ai_busy");
    if (response.status === 400) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // ignore: treated as a generic failure below
      }
      if (body.includes(INVALID_KEY_MARKER)) throw new AiError("ai_auth");
    }
    throw new AiError("ai_unavailable");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AiError("ai_bad_response");
  }

  const candidate = Array.isArray(data?.candidates) ? data.candidates[0] : null;

  // Anything other than a normal finish (MAX_TOKENS = truncated JSON,
  // SAFETY, RECITATION, ...) is not a usable answer.
  if (!candidate || (candidate.finishReason && candidate.finishReason !== "STOP")) {
    throw new AiError("ai_bad_response");
  }

  const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
  const text = parts
    .filter((part) => part && typeof part.text === "string" && part.thought !== true)
    .map((part) => part.text)
    .join("");

  if (!text.trim()) throw new AiError("ai_bad_response");
  return text;
}

module.exports = { name: "gemini", generate };