const prisma = require("../config/prisma");
const { createInsights } = require("../services/insights.service");
const { AiError } = require("../services/ai");

// How each AI failure is reported. Messages are written for the end user
// and never contain provider details. Each case has its own HTTP status,
// so the client can tell them apart without parsing text.
const AI_FAILURES = {
  ai_not_configured: {
    status: 503,
    message: "AI Insights isn't set up on this server yet.",
  },
  ai_auth: {
    status: 502,
    message: "AI Insights is temporarily unavailable. Please try again later.",
  },
  ai_busy: {
    status: 502,
    message: "The AI service is busy right now. Please try again in a moment.",
  },
  ai_unavailable: {
    status: 502,
    message: "AI Insights is temporarily unavailable. Please try again later.",
  },
  ai_bad_response: {
    status: 502,
    message: "We couldn't generate usable insights this time. Please try again.",
  },
  ai_timeout: {
    status: 504,
    message: "The AI service took too long to respond. Please try again.",
  },
};

/**
 * POST /api/insights
 *
 * Generates insights on demand for the AUTHENTICATED user and returns
 * them without storing anything. The request body is not used at all:
 * whose data is analysed comes only from req.user (the verified JWT), so
 * no userId from the browser can point this at another account.
 */
async function generateInsights(req, res) {
  try {
    const where = { userId: req.user.id };
    const [healthProfile, wealthProfile] = await Promise.all([
      prisma.healthProfile.findUnique({ where }),
      prisma.wealthProfile.findUnique({ where }),
    ]);

    const missing = [];
    if (!healthProfile) missing.push("health");
    if (!wealthProfile) missing.push("wealth");

    if (missing.length === 2) {
      return res.status(409).json({
        message:
          "Add your health or wealth details first so there is something to analyse.",
        missing,
      });
    }

    const insights = await createInsights({ healthProfile, wealthProfile });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      insights,
      missing, // the one profile (if any) the insights couldn't use
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AiError) {
      const failure = AI_FAILURES[error.code] || AI_FAILURES.ai_unavailable;
      // Code only: never the prompt, the profile data or provider output.
      console.error(`AI insights failed (${error.code}).`);
      return res.status(failure.status).json({ message: failure.message });
    }
    console.error("Insights request failed.");
    return res
      .status(500)
      .json({ message: "Unable to generate insights right now." });
  }
}

module.exports = { generateInsights };
