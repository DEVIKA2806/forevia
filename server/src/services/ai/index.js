const { getAiConfig } = require("../../config/ai");
const { AiError } = require("./errors");
const gemini = require("./gemini.provider");

// Register adapters here. Selected by the AI_PROVIDER environment variable.
// "anthropic" stays registered so you can switch back by changing .env only.
const PROVIDERS = { gemini };

/**
 * Returns { generate(request) } bound to the current configuration, or
 * throws AiError("ai_not_configured") when there is no key or the
 * provider name is unknown. Callers never see the key.
 */
function getAiClient() {
  const config = getAiConfig();
  const provider = PROVIDERS[config.provider];

  if (!provider || !config.apiKey) {
    throw new AiError("ai_not_configured");
  }

  return {
    generate: (request) => provider.generate(request, config),
  };
}

module.exports = { getAiClient, AiError };