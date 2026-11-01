const { parseNumber } = require("../utils/validation");

/**
 * Pure goal logic: input validation, progress calculation and response
 * shaping. No database, no Express, so every rule here can be tested
 * directly. The controller supplies the saved record and the request body.
 */

// Same guard against typos / absurd input as the wealth profile.
const MAX_AMOUNT = 1_000_000_000;
const MAX_TITLE_LENGTH = 100;
// Stops one account from creating goals without limit.
const MAX_GOALS_PER_USER = 50;
const MIN_TARGET_YEAR = 2000;
const MAX_TARGET_YEAR = 2100;

const DAY_MS = 24 * 60 * 60 * 1000;
// Plain decimal numbers only: "12", "12.5", ".5". This rejects "0x10",
// "1e5" and similar strings that Number() would otherwise accept.
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);

/** Date -> "YYYY-MM-DD" (the stored value is a UTC calendar date). */
function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Progress toward a goal, from its two amounts. Never divides by zero and
 * never returns NaN or Infinity:
 *   - a missing, non-numeric, zero or negative target (or a negative saved
 *     amount) gives null percent and remaining ("can't be worked out");
 *   - percent is capped at 100 and shows 100 only when the goal is truly
 *     reached (99.96% is shown as 99.9, never rounded up to "done");
 *   - remaining is never negative.
 */
function calculateGoalProgress(targetAmount, currentAmount) {
  const unknown = { progressPercent: null, remainingAmount: null, isCompleted: false };
  if (!isFiniteNumber(targetAmount) || !isFiniteNumber(currentAmount)) return unknown;
  if (targetAmount <= 0 || currentAmount < 0) return unknown;

  const isCompleted = currentAmount >= targetAmount;
  let percent = Math.round((currentAmount / targetAmount) * 1000) / 10;
  if (isCompleted) percent = 100;
  else if (percent >= 100) percent = 99.9;

  return {
    progressPercent: percent,
    remainingAmount: Math.round(Math.max(0, targetAmount - currentAmount) * 100) / 100,
    isCompleted,
  };
}

/** The shape every goal endpoint returns. Never includes userId. */
function serializeGoal(record) {
  return {
    id: record.id,
    title: record.title,
    targetAmount: record.targetAmount,
    currentAmount: record.currentAmount,
    targetDate: record.targetDate ? toIsoDate(record.targetDate) : null,
    ...calculateGoalProgress(record.targetAmount, record.currentAmount),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function parseTitle(raw) {
  if (raw === undefined || raw === null) return { error: "Title is required." };
  if (typeof raw !== "string") return { error: "Title must be text." };
  const value = raw.trim();
  if (!value) return { error: "Title is required." };
  if (value.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }
  return { value };
}

function parseAmount(raw, label, { positive = false } = {}) {
  // Only strings (from forms) and numbers (from JSON) are accepted. An
  // array, object or boolean must not be coerced: Number([5]) is 5 and
  // Number(true) is 1.
  if (raw !== undefined && raw !== null && typeof raw !== "string" && typeof raw !== "number") {
    return { error: `${label} must be a valid number.` };
  }
  if (typeof raw === "string" && raw.trim() !== "" && !PLAIN_NUMBER.test(raw.trim())) {
    return { error: `${label} must be a valid number.` };
  }

  const result = parseNumber(raw, { label, max: MAX_AMOUNT });
  if (result.error) return result;

  if (result.value < 0) return { error: `${label} cannot be negative.` };
  if (positive && result.value <= 0) {
    return { error: `${label} must be greater than zero.` };
  }
  const cents = result.value * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    return { error: `${label} can have at most 2 decimal places.` };
  }
  // Store exactly what the user means (0.1 + 0.2 -> 0.3), not float noise.
  return { value: Math.round(cents) / 100 };
}

/**
 * Optional "YYYY-MM-DD". Empty / missing means "no target date".
 * Must be a real calendar date (2027-02-30 is rejected). A date in the
 * past is rejected only when it is new or changed, so a goal whose date
 * has since passed can still be edited. One day of leeway covers users in
 * a timezone behind the server's.
 */
function parseTargetDate(raw, { previousTargetDate, now }) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== "string") return { error: "Target date must be a valid date." };

  const text = raw.trim();
  if (text === "") return { value: null };

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return { error: "Target date must be a valid date." };

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Target date must be a valid date." };
  }
  if (year < MIN_TARGET_YEAR || year > MAX_TARGET_YEAR) {
    return {
      error: `Target date must be between the years ${MIN_TARGET_YEAR} and ${MAX_TARGET_YEAR}.`,
    };
  }

  if (previousTargetDate !== text) {
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (date.getTime() < todayUtc - DAY_MS) {
      return { error: "Target date can't be in the past." };
    }
  }
  return { value: date };
}

/**
 * Validates a create/update request body. Returns { data } ready to save,
 * or { errors } keyed by field. Only the four editable fields are read:
 * an id, userId or createdAt in the body is ignored, so a request can
 * never reassign a goal to another user.
 *
 * @param {object} body
 * @param {{ previousTargetDate?: string|null, now?: Date }} [context]
 */
function validateGoalInput(body, { previousTargetDate = null, now = new Date() } = {}) {
  const source = body && typeof body === "object" ? body : {};
  const errors = {};
  const data = {};

  const title = parseTitle(source.title);
  if (title.error) errors.title = title.error;
  else data.title = title.value;

  const target = parseAmount(source.targetAmount, "Target amount", { positive: true });
  if (target.error) errors.targetAmount = target.error;
  else data.targetAmount = target.value;

  const current = parseAmount(source.currentAmount, "Current saved amount");
  if (current.error) errors.currentAmount = current.error;
  else data.currentAmount = current.value;

  const date = parseTargetDate(source.targetDate, { previousTargetDate, now });
  if (date.error) errors.targetDate = date.error;
  else data.targetDate = date.value;

  return Object.keys(errors).length > 0 ? { errors } : { data };
}

module.exports = {
  MAX_AMOUNT,
  MAX_TITLE_LENGTH,
  MAX_GOALS_PER_USER,
  toIsoDate,
  calculateGoalProgress,
  serializeGoal,
  validateGoalInput,
};
