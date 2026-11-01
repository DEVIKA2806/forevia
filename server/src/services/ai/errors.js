/**
 * Failure from the AI layer. `code` is a short stable string the
 * controller maps to an HTTP status and a user-safe message. Raw provider
 * responses are never attached: they could echo prompt content.
 *
 *   ai_not_configured  no key / unknown provider
 *   ai_auth            provider rejected our key (admin problem)
 *   ai_busy            provider rate-limited or overloaded us
 *   ai_timeout         provider too slow
 *   ai_unavailable     network failure or provider 5xx
 *   ai_bad_response    reply wasn't usable
 */
class AiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "AiError";
    this.code = code;
  }
}

module.exports = { AiError };
