const prisma = require("../config/prisma");
const {
  parseNumber,
  parseOptionalNumber,
  parseChoice,
} = require("../utils/validation");

const FINANCIAL_GOALS = [
  "emergency_fund",
  "buy_home",
  "retirement",
  "education",
  "wealth_growth",
  "debt_free",
  "other",
];

// Upper bound on money fields. Not a business rule so much as a guard
// against typos and absurd input reaching the database.
const MAX_AMOUNT = 1_000_000_000;

/**
 * GET /api/wealth-profile
 *
 * Returns the authenticated user's wealth profile, or null if not yet
 * filled in. Identity comes from the verified JWT via req.user, so a user
 * can only ever read their own record.
 */
async function getWealthProfile(req, res) {
  try {
    const profile = await prisma.wealthProfile.findUnique({
      where: { userId: req.user.id },
    });

    return res.status(200).json({ profile: profile || null });
  } catch (error) {
    // Never log the record — financial data must stay out of server logs.
    console.error("Get wealth profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to load your financial profile." });
  }
}

/**
 * PUT /api/wealth-profile
 *
 * Creates on first save, updates thereafter (upsert), mirroring the
 * health profile endpoint.
 */
async function saveWealthProfile(req, res) {
  try {
    const body = req.body || {};
    const errors = {};
    const data = {};

    // Every money field is required, must be zero or positive, and
    // capped. Zero is legitimate here (e.g. no debt, no investments yet),
    // so the minimum is 0 rather than something higher.
    const moneyFields = [
      ["monthlyIncome", "Monthly income"],
      ["monthlyExpenses", "Monthly expenses"],
      ["currentSavings", "Current savings"],
      ["currentInvestments", "Current investments"],
      ["existingDebt", "Existing debts or loans"],
      ["monthlyInvestment", "Monthly investment amount"],
    ];

    for (const [field, label] of moneyFields) {
      const result = parseNumber(body[field], {
        label,
        min: 0,
        max: MAX_AMOUNT,
      });
      if (result.error) errors[field] = result.error;
      else data[field] = result.value;
    }

    const financialGoal = parseChoice(body.financialGoal, {
      label: "Financial goal",
      allowed: FINANCIAL_GOALS,
    });
    if (financialGoal.error) errors.financialGoal = financialGoal.error;
    else data.financialGoal = financialGoal.value;

    // Optional: a user may have a goal without a specific figure in mind.
    const targetAmount = parseOptionalNumber(body.targetAmount, {
      label: "Target amount",
      min: 0,
      max: MAX_AMOUNT,
    });
    if (targetAmount.error) errors.targetAmount = targetAmount.error;
    else data.targetAmount = targetAmount.value;

    const targetYears = parseOptionalNumber(body.targetYears, {
      label: "Target time period",
      min: 1,
      max: 100,
      integer: true,
    });
    if (targetYears.error) errors.targetYears = targetYears.error;
    else data.targetYears = targetYears.value;

    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({ message: "Please correct the highlighted fields.", errors });
    }

    const profile = await prisma.wealthProfile.upsert({
      where: { userId: req.user.id },
      create: { ...data, userId: req.user.id },
      update: data,
    });

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("Save wealth profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to save your financial profile." });
  }
}

module.exports = { getWealthProfile, saveWealthProfile };
