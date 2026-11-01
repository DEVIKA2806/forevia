// Required fields for each profile, matching what the Phase 6 forms
// actually require (HealthProfilePage.jsx / WealthProfilePage.jsx).
// Optional fields (conditions, healthGoals, targetAmount, targetYears)
// are intentionally excluded — the brief asks for completion based on
// *required* fields only.
const REQUIRED_HEALTH_FIELDS = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "activityLevel",
  "sleepHours",
  "smokingStatus",
  "alcoholUse",
];

const REQUIRED_WEALTH_FIELDS = [
  "monthlyIncome",
  "monthlyExpenses",
  "currentSavings",
  "currentInvestments",
  "existingDebt",
  "monthlyInvestment",
  "financialGoal",
];

// A field "counts" as filled if it isn't missing entirely. Note: 0 is a
// valid, meaningful value for several wealth fields (e.g. no debt yet),
// so only null/undefined/empty-string count as "not filled" — a
// legitimate 0 must not be treated as missing.
function isFilled(value) {
  return value !== null && value !== undefined && value !== "";
}

function calculateCompletion(profile, requiredFields) {
  if (!profile) {
    return { filledCount: 0, totalCount: requiredFields.length, percent: 0 };
  }

  const filledCount = requiredFields.filter((field) =>
    isFilled(profile[field])
  ).length;
  const totalCount = requiredFields.length;
  const percent = Math.round((filledCount / totalCount) * 100);

  return { filledCount, totalCount, percent };
}

export function getHealthCompletion(healthProfile) {
  return calculateCompletion(healthProfile, REQUIRED_HEALTH_FIELDS);
}

export function getWealthCompletion(wealthProfile) {
  return calculateCompletion(wealthProfile, REQUIRED_WEALTH_FIELDS);
}

// Simple average of the two section percentages, per the brief's
// specified formula. Rounded to a whole percent for display.
export function getOverallCompletion(healthProfile, wealthProfile) {
  const health = getHealthCompletion(healthProfile);
  const wealth = getWealthCompletion(wealthProfile);
  return Math.round((health.percent + wealth.percent) / 2);
}
