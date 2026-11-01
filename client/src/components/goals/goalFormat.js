import { EMPTY_VALUE } from "../../utils/formatters.js";
import { todayLocalIso } from "../../utils/goalValidation.js";

// Goals can have paise (₹1,499.50), so unlike utils/formatters.js this
// doesn't always round to whole rupees. Whole amounts show no decimals
// (₹1,00,000); anything with paise always shows both digits (₹80,000.50,
// never ₹80,000.5).
const wholeMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const paiseMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

export function formatMoney(value) {
  if (!isNumber(value)) return EMPTY_VALUE;
  return Number.isInteger(value) ? wholeMoney.format(value) : paiseMoney.format(value);
}

export function formatProgress(percent) {
  return isNumber(percent) ? `${percent}%` : EMPTY_VALUE;
}

/** "2027-03-15" -> "15 Mar 2027", without any timezone shifting. */
export function formatTargetDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === "string" ? iso : "");
  if (!match) return EMPTY_VALUE;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** True when the goal's date has passed and the goal isn't complete. */
export function isPastTarget(goal, today = todayLocalIso()) {
  return !goal.isCompleted && typeof goal.targetDate === "string" && goal.targetDate < today;
}
