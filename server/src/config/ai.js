/**
 * AI provider settings, read from environment variables ONLY.
 *
 * Read at call time (not at require time) so the values reflect the
 * environment after dotenv has loaded, and so nothing here is ever
 * captured in a module-level constant that could be logged or exported.
 * The API key stays on the server: it is never sent to the browser and
 * never included in an API response.
 *
 *   AI_PROVIDER        which adapter to use: "gemini" (default) or "anthropic"
 *   AI_API_KEY         provider secret. Unset = AI Insights reports "not set up"
 *   AI_MODEL           model id to call (default depends on the provider)
 *   AI_BASE_URL        override the provider endpoint (proxies, testing)
 *   AI_TIMEOUT_MS      give up on a slow provider after this long
 *   AI_THINKING_LEVEL  Gemini only: "minimal" | "low" | "medium" | "high"
 *                      (default "low": faster, and keeps the JSON from being
 *                      cut off by thinking tokens)
 */
const DEFAULT_PROVIDER = "gemini";

// Model and endpoint defaults per provider.
const PROVIDER_DEFAULTS = {
  gemini: {
    model: "gemini-3.8-flash",
    baseUrl: "https://generativelanguage.googleapis.com",
  },
  anthropic: {
    model: "claude-sonnet-5-5",
    baseUrl: "https://api.anthropic.com",
  },
};

const THINKING_LEVELS = ["minimal", "low", "medium", "high"];
const DEFAULT_THINKING_LEVEL = "low";
const DEFAULT_TIMEOUT_MS = 30000;

function getAiConfig() {
  const timeout = Number(process.env.AI_TIMEOUT_MS);
  const provider = (process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS[DEFAULT_PROVIDER];
  const thinking = (process.env.AI_THINKING_LEVEL || "").trim().toLowerCase();

  return {
    provider,
    apiKey: (process.env.AI_API_KEY || "").trim(),
    model: (process.env.AI_MODEL || defaults.model).trim(),
    baseUrl: (process.env.AI_BASE_URL || defaults.baseUrl).trim().replace(/\/+$/, ""),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    // Gemini 3 counts thinking tokens against this limit, so it is higher
    // than the old 1500. The insights JSON itself is well under 2000 tokens.
    maxOutputTokens: 4096,
    thinkingLevel: THINKING_LEVELS.includes(thinking) ? thinking : DEFAULT_THINKING_LEVEL,
  };
}

module.exports = { getAiConfig };