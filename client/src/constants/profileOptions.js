// Human-readable labels for the choice fields stored by the Phase 6
// health/wealth forms. Kept separate from HealthProfilePage/
// WealthProfilePage (which have their own local option lists for the
// <select> elements) so this phase doesn't touch those already-working
// files — a small amount of duplication traded for zero regression risk
// to the existing forms.
export const ACTIVITY_LEVEL_LABELS = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
};

export const SMOKING_STATUS_LABELS = {
  never: "Never",
  occasionally: "Occasionally",
  regularly: "Regularly",
  former: "Former smoker",
};

export const ALCOHOL_USE_LABELS = {
  never: "Never",
  occasionally: "Occasionally",
  regularly: "Regularly",
};

export const GENDER_LABELS = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const FINANCIAL_GOAL_LABELS = {
  emergency_fund: "Build an emergency fund",
  buy_home: "Buy a home",
  retirement: "Retirement planning",
  education: "Education",
  wealth_growth: "Grow long-term wealth",
  debt_free: "Become debt free",
  other: "Other",
};

// Falls back to the raw stored value if it's somehow not in the map,
// rather than showing "undefined" — defensive against future option
// additions to the forms that this file hasn't been updated for yet.
export function labelFor(map, value) {
  return map[value] || value;
}

// Phase 8: labels for values returned by /api/calculations/summary.
export const BMI_CATEGORY_LABELS = {
  underweight: "Underweight range",
  normal: "Typical range",
  overweight: "Overweight range",
  obese: "Obese range",
};

export const FINANCIAL_STATUS_LABELS = {
  positive_cash_flow: "Positive cash flow",
  negative_cash_flow: "Negative cash flow",
  balanced: "Balanced",
  insufficient_data: "Not enough data",
};

// Badge tone for each status. Cash-flow direction only, not a judgement
// of the person's overall finances.
export const FINANCIAL_STATUS_TONES = {
  positive_cash_flow: "success",
  negative_cash_flow: "danger",
  balanced: "neutral",
  insufficient_data: "neutral",
};
