// Input handling for the What-If Simulator. Scenario values live only in
// component state as strings (so a half-typed number never breaks the
// field); this file turns them into validated numbers. The limits match
// the ones the server enforces, so a scenario can never be something the
// saved profile itself would reject.

export const MAX_AMOUNT = 1_000_000_000;
export const PERIOD_OPTIONS = [1, 3, 5, 10];
export const DEFAULT_PERIOD = 5;

const WEALTH_FIELDS = [
  ["monthlyIncome", "Monthly income", 0, MAX_AMOUNT],
  ["monthlyExpenses", "Monthly expenses", 0, MAX_AMOUNT],
  ["monthlyInvestment", "Monthly investment", 0, MAX_AMOUNT],
  ["currentSavings", "Current savings", 0, MAX_AMOUNT],
];

function toText(value) {
  return value === null || value === undefined ? "" : String(value);
}

/** Starting scenario: exactly the saved values, as strings. */
export function initialScenario(healthProfile, wealthProfile) {
  return {
    monthlyIncome: toText(wealthProfile?.monthlyIncome),
    monthlyExpenses: toText(wealthProfile?.monthlyExpenses),
    monthlyInvestment: toText(wealthProfile?.monthlyInvestment),
    currentSavings: toText(wealthProfile?.currentSavings),
    years: String(DEFAULT_PERIOD),
    weightKg: toText(healthProfile?.weightKg),
    activityLevel: toText(healthProfile?.activityLevel),
    sleepHours: toText(healthProfile?.sleepHours),
  };
}

/** Returns a finite number or null (for "", "abc", Infinity, NaN). */
export function parseInput(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function checkNumber(raw, label, min, max) {
  const n = parseInput(raw);
  if (n === null) return { error: `${label} must be a number.` };
  if (n < min) return { error: `${label} must be at least ${min}.` };
  if (n > max) return { error: `${label} must be ${max.toLocaleString("en-IN")} or less.` };
  return { value: n };
}

/**
 * Validates every field that applies and builds the request body.
 * Returns { errors, body }: body is null whenever any field is invalid,
 * so an invalid scenario is never sent.
 */
export function validateScenario(values, { hasWealth, hasHealth }) {
  const errors = {};
  const body = {};

  if (hasWealth) {
    body.wealth = {};
    for (const [field, label, min, max] of WEALTH_FIELDS) {
      const r = checkNumber(values[field], label, min, max);
      if (r.error) errors[field] = r.error;
      else body.wealth[field] = r.value;
    }

    const years = Number(values.years);
    if (!PERIOD_OPTIONS.includes(years)) {
      errors.years = "Choose a simulation period.";
    } else {
      body.years = years;
    }
  }

  if (hasHealth) {
    body.health = {};
    const weight = checkNumber(values.weightKg, "Weight", 20, 400);
    if (weight.error) errors.weightKg = weight.error;
    else body.health.weightKg = weight.value;

    const sleep = checkNumber(values.sleepHours, "Sleep", 0, 24);
    if (sleep.error) errors.sleepHours = sleep.error;
    else body.health.sleepHours = sleep.value;

    if (!values.activityLevel) errors.activityLevel = "Choose an activity level.";
    else body.health.activityLevel = values.activityLevel;
  }

  return { errors, body: Object.keys(errors).length ? null : body };
}

export function isScenarioChanged(values, initial) {
  return Object.keys(initial).some((key) => values[key] !== initial[key]);
}
