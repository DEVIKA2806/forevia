const prisma = require("../config/prisma");
const {
  calculateProjectionsOverview,
  DEFAULT_PROJECTION_YEARS,
  MAX_PROJECTION_YEARS,
  MAX_ILLUSTRATIVE_RETURN_PERCENT,
} = require("../services/calculation.service");
const { parseOptionalNumber } = require("../utils/validation");

// A query value must be a single string. Express turns ?years=1&years=2
// into an array and ?years[a]=1 into an object; neither is a number.
function parseQueryNumber(raw, options) {
  if (raw !== undefined && typeof raw !== "string") {
    return { error: `${options.label} must be a valid number.` };
  }
  return parseOptionalNumber(raw, options);
}

/**
 * GET /api/calculations/projections?years=5&annualReturn=0
 *
 * Chart and projection data for the Charts & Projections page, worked
 * out from the authenticated user's SAVED profiles by the deterministic
 * calculation service. It reads only: nothing is written, and it never
 * calls the AI provider, so it works when AI Insights is unavailable.
 *
 *   years         whole years, 1..50 (default 5)
 *   annualReturn  OPTIONAL illustrative yearly return on investments, in
 *                 percent, 0..20 (default 0 = no returns assumed)
 *
 * Whose profiles? Always req.user.id (from the verified JWT). No id is
 * read from the URL, query string or body.
 */
async function getProjections(req, res) {
  try {
    const errors = {};

    const years = parseQueryNumber(req.query.years, {
      label: "Projection period",
      min: 1,
      max: MAX_PROJECTION_YEARS,
      integer: true,
    });
    if (years.error) errors.years = years.error;

    const annualReturn = parseQueryNumber(req.query.annualReturn, {
      label: "Illustrative return",
      min: 0,
      max: MAX_ILLUSTRATIVE_RETURN_PERCENT,
    });
    if (annualReturn.error) errors.annualReturn = annualReturn.error;

    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({ message: "Please check the projection settings.", errors });
    }

    const where = { userId: req.user.id };
    const [healthProfile, wealthProfile] = await Promise.all([
      prisma.healthProfile.findUnique({ where }),
      prisma.wealthProfile.findUnique({ where }),
    ]);

    const result = calculateProjectionsOverview(
      { healthProfile, wealthProfile },
      {
        years: years.value !== null ? years.value : DEFAULT_PROJECTION_YEARS,
        annualReturnPercent: annualReturn.value !== null ? annualReturn.value : 0,
      }
    );

    // Personal data: make sure no shared cache stores it.
    res.set("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    // Never log the query or the profiles.
    console.error("Projections failed.");
    return res
      .status(500)
      .json({ message: "Unable to calculate your projections." });
  }
}

module.exports = { getProjections };
