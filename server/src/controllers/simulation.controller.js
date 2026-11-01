const prisma = require("../config/prisma");
const {
  calculateSimulation,
  MAX_PROJECTION_YEARS,
} = require("../services/calculation.service");
const { parseOptionalNumber } = require("../utils/validation");

// Same bounds the profile endpoints enforce, so a scenario can never be
// something the saved profile itself would have rejected.
const MAX_AMOUNT = 1_000_000_000;
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"];

const WEALTH_FIELDS = [
  ["monthlyIncome", "Monthly income"],
  ["monthlyExpenses", "Monthly expenses"],
  ["monthlyInvestment", "Monthly investment"],
  ["currentSavings", "Current savings"],
];

// parseOptionalNumber would accept true/[5]/{} through Number(); a
// scenario field must be a number or a numeric string, nothing else.
function parseScenarioNumber(raw, options) {
  if (
    raw !== undefined &&
    raw !== null &&
    typeof raw !== "number" &&
    typeof raw !== "string"
  ) {
    return { error: `${options.label} must be a valid number.` };
  }
  return parseOptionalNumber(raw, options);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * POST /api/calculations/simulate
 *
 * Body (every field optional; omitted = use the saved value):
 *   { years, wealth: { monthlyIncome, monthlyExpenses, monthlyInvestment,
 *     currentSavings }, health: { weightKg, activityLevel, sleepHours } }
 *
 * This is a calculation, not a save. It only READS the saved profiles,
 * applies the scenario to in-memory copies, and returns current vs
 * what-if. It performs no database writes, so saved profiles cannot
 * change. POST is used only because the scenario is sent in a body.
 *
 * Whose profiles? Always req.user.id (from the verified JWT). The body is
 * never consulted for an id.
 */
async function simulate(req, res) {
  try {
    const body = req.body;
    if (body !== undefined && !isPlainObject(body)) {
      return res.status(400).json({ message: "Invalid scenario." });
    }

    const input = body || {};
    for (const key of ["wealth", "health"]) {
      if (input[key] !== undefined && !isPlainObject(input[key])) {
        return res.status(400).json({ message: "Invalid scenario." });
      }
    }

    const errors = {};
    const scenario = { wealth: {}, health: {} };

    const years = parseScenarioNumber(input.years, {
      label: "Simulation period",
      min: 1,
      max: MAX_PROJECTION_YEARS,
      integer: true,
    });
    if (years.error) errors.years = years.error;
    else if (years.value !== null) scenario.years = years.value;

    for (const [field, label] of WEALTH_FIELDS) {
      const r = parseScenarioNumber(input.wealth?.[field], {
        label,
        min: 0,
        max: MAX_AMOUNT,
      });
      if (r.error) errors[field] = r.error;
      else if (r.value !== null) scenario.wealth[field] = r.value;
    }

    const weight = parseScenarioNumber(input.health?.weightKg, {
      label: "Weight",
      min: 20,
      max: 400,
    });
    if (weight.error) errors.weightKg = weight.error;
    else if (weight.value !== null) scenario.health.weightKg = weight.value;

    const sleep = parseScenarioNumber(input.health?.sleepHours, {
      label: "Sleep duration",
      min: 0,
      max: 24,
    });
    if (sleep.error) errors.sleepHours = sleep.error;
    else if (sleep.value !== null) scenario.health.sleepHours = sleep.value;

    const activity = input.health?.activityLevel;
    if (activity !== undefined && activity !== null && activity !== "") {
      if (typeof activity !== "string" || !ACTIVITY_LEVELS.includes(activity)) {
        errors.activityLevel = "Physical activity level is not a valid option.";
      } else {
        scenario.health.activityLevel = activity;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({ message: "Please correct the highlighted fields.", errors });
    }

    const where = { userId: req.user.id };
    const [healthProfile, wealthProfile] = await Promise.all([
      prisma.healthProfile.findUnique({ where }),
      prisma.wealthProfile.findUnique({ where }),
    ]);

    const result = calculateSimulation(
      { healthProfile, wealthProfile },
      scenario
    );

    res.set("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    // Never log the scenario or the profiles.
    console.error("Simulation failed.");
    return res.status(500).json({ message: "Unable to run the simulation." });
  }
}

module.exports = { simulate };
