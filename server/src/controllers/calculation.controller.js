const prisma = require("../config/prisma");
const { calculateSummary } = require("../services/calculation.service");

/**
 * GET /api/calculations/summary
 *
 * Returns deterministic metrics calculated from the authenticated user's
 * saved health and wealth profiles. Either section is null if that
 * profile hasn't been filled in yet (a normal state, not an error).
 *
 * The user id comes only from req.user, which requireAuth derived from
 * the verified JWT cookie. The endpoint accepts no id from the URL, query
 * string or body, so one user cannot request another user's numbers.
 */
async function getCalculationSummary(req, res) {
  try {
    const where = { userId: req.user.id };

    const [healthProfile, wealthProfile] = await Promise.all([
      prisma.healthProfile.findUnique({ where }),
      prisma.wealthProfile.findUnique({ where }),
    ]);

    const summary = calculateSummary({ healthProfile, wealthProfile });

    // Personal data: make sure no shared cache stores it.
    res.set("Cache-Control", "no-store");
    return res.status(200).json(summary);
  } catch (error) {
    // Log only that it failed, never the records themselves.
    console.error("Calculation summary failed.");
    return res
      .status(500)
      .json({ message: "Unable to calculate your summary." });
  }
}

module.exports = { getCalculationSummary };
