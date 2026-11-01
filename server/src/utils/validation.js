/**
 * Small validation helpers shared by the health and wealth profile
 * controllers. Kept deliberately simple (no validation library) so the
 * rules are readable and easy to change.
 *
 * All of these run on the server regardless of what the frontend already
 * checked — a request can always be sent directly to the API, bypassing
 * the form entirely.
 */

/**
 * Parses a required number and range-checks it. Returns either
 * { value } or { error }.
 */
function parseNumber(raw, { label, min, max, integer = false }) {
  // Trimmed first so a whitespace-only value (" ") is treated as missing
  // rather than silently becoming 0 — Number(" ") is 0 in JavaScript,
  // which would otherwise let malformed input slip through as valid.
  const trimmed = typeof raw === "string" ? raw.trim() : raw;

  if (trimmed === undefined || trimmed === null || trimmed === "") {
    return { error: `${label} is required.` };
  }

  // Only strings (from forms) and numbers (from JSON) are numbers. Without
  // this, Number() would quietly turn [30] into 30, true into 1 and [] into
  // 0, so a wrongly-typed value would be saved as if it were valid.
  if (typeof trimmed !== "string" && typeof trimmed !== "number") {
    return { error: `${label} must be a valid number.` };
  }

  const value = Number(trimmed);

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return { error: `${label} must be a valid number.` };
  }
  if (integer && !Number.isInteger(value)) {
    return { error: `${label} must be a whole number.` };
  }
  if (min !== undefined && value < min) {
    return { error: `${label} must be at least ${min}.` };
  }
  if (max !== undefined && value > max) {
    return { error: `${label} must be ${max} or less.` };
  }

  return { value };
}

/**
 * Same as parseNumber, but an empty value is allowed and resolves to
 * null (stored as "not provided" rather than zero).
 */
function parseOptionalNumber(raw, options) {
  const trimmed = typeof raw === "string" ? raw.trim() : raw;
  if (trimmed === undefined || trimmed === null || trimmed === "") {
    return { value: null };
  }
  return parseNumber(raw, options);
}

/**
 * Checks a value is one of an allowed set. Prevents arbitrary strings
 * being stored in fields that should behave like enums.
 */
function parseChoice(raw, { label, allowed }) {
  // A non-string (number, object, array...) is never a valid option, and
  // must not reach .trim(), which would throw and turn into a 500.
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return { error: `${label} is not a valid option.` };
  }
  const value = (raw || "").trim();
  if (!value) {
    return { error: `${label} is required.` };
  }
  if (!allowed.includes(value)) {
    return { error: `${label} is not a valid option.` };
  }
  return { value };
}

/**
 * Trims an optional free-text field and enforces a maximum length.
 * Empty becomes null.
 */
function parseOptionalText(raw, { label, maxLength = 500 }) {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return { error: `${label} must be text.` };
  }
  const value = (raw || "").trim();
  if (!value) return { value: null };
  if (value.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.` };
  }
  return { value };
}

module.exports = {
  parseNumber,
  parseOptionalNumber,
  parseChoice,
  parseOptionalText,
};
