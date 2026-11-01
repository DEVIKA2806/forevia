// Goal form validation. This mirrors the server's rules
// (server/src/services/goal.service.js) so people get instant feedback;
// the server still checks everything again, because a request can always
// bypass the form. Pure and import-free so it can be tested directly.

export const GOAL_LIMITS = {
  titleMax: 100,
  amountMax: 1_000_000_000,
  minYear: 2000,
  maxYear: 2100,
};

// Plain decimal numbers only ("12", "12.5", ".5"): no "1e3" or "0x10".
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/** Today's date in the user's own timezone, as "YYYY-MM-DD". */
export function todayLocalIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function checkAmount(raw, label, { positive }) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === "") return `${label} is required.`;
  if (!PLAIN_NUMBER.test(text)) return `${label} must be a valid number.`;

  const value = Number(text);
  if (!Number.isFinite(value)) return `${label} must be a valid number.`;
  if (value < 0) return `${label} cannot be negative.`;
  if (positive && value <= 0) return `${label} must be greater than zero.`;
  if (value > GOAL_LIMITS.amountMax) {
    return `${label} must be ${GOAL_LIMITS.amountMax} or less.`;
  }
  const cents = value * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    return `${label} can have at most 2 decimal places.`;
  }
  return "";
}

function checkDate(raw, { originalTargetDate, today }) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === "") return ""; // optional

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return "Target date must be a valid date.";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "Target date must be a valid date.";
  }
  if (year < GOAL_LIMITS.minYear || year > GOAL_LIMITS.maxYear) {
    return `Target date must be between the years ${GOAL_LIMITS.minYear} and ${GOAL_LIMITS.maxYear}.`;
  }
  // A date that is unchanged from what's saved may have passed since; only
  // a new or changed date must not be in the past.
  if (text !== originalTargetDate && text < today) {
    return "Target date can't be in the past.";
  }
  return "";
}

/**
 * Returns an object of { field: message } for every problem, or an empty
 * object when the values are fine.
 *
 * values: { title, targetAmount, currentAmount, targetDate } as strings.
 */
export function validateGoalForm(
  values,
  { originalTargetDate = null, today = todayLocalIso() } = {}
) {
  const errors = {};

  const title = typeof values.title === "string" ? values.title.trim() : "";
  if (!title) errors.title = "Title is required.";
  else if (title.length > GOAL_LIMITS.titleMax) {
    errors.title = `Title must be ${GOAL_LIMITS.titleMax} characters or fewer.`;
  }

  const target = checkAmount(values.targetAmount, "Target amount", { positive: true });
  if (target) errors.targetAmount = target;

  const current = checkAmount(values.currentAmount, "Current saved amount", { positive: false });
  if (current) errors.currentAmount = current;

  const date = checkDate(values.targetDate, { originalTargetDate, today });
  if (date) errors.targetDate = date;

  return errors;
}
