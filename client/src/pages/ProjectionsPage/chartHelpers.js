import { PERIOD_OPTIONS } from "../../utils/simulatorInputs";
import { EMPTY_VALUE } from "../../utils/formatters";

// Same periods as the What-If Simulator, so the two pages agree.
export { PERIOD_OPTIONS };
export const DEFAULT_YEARS = 5;

// Illustrative yearly returns offered on the page. 0 = none assumed. These
// are examples to explore, not forecasts or recommendations.
export const RETURN_OPTIONS = [0, 4, 8, 12];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// 1.5 -> "1.5", 2 -> "2" (one decimal at most, no trailing zero).
const trim = (n) => String(Number(n.toFixed(1)));

/**
 * Short INR for chart axes: ₹25K, ₹1.5L, ₹2Cr. Written out by hand
 * because Intl's Indian compact format writes thousands as "T" (₹75T),
 * which most people read as trillions. Exact values are shown elsewhere.
 */
export function formatCompactCurrency(value) {
  if (!isNum(value)) return EMPTY_VALUE;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  let text;
  if (abs >= 1e7) text = `${trim(abs / 1e7)}Cr`;
  else if (abs >= 1e5) text = `${trim(abs / 1e5)}L`;
  else if (abs >= 1e3) text = `${trim(abs / 1e3)}K`;
  else text = String(Math.round(abs));
  return `${sign}₹${text}`;
}

/** 14 -> "1 year 2 months". */
export function formatMonths(months) {
  if (!isNum(months) || months < 0) return EMPTY_VALUE;
  if (months === 0) return "0 months";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

/** X-axis tick positions (in months) that stay readable on small screens. */
export function monthTicks(totalMonths) {
  let step = 60;
  if (totalMonths <= 12) step = 3;
  else if (totalMonths <= 60) step = 12;
  else if (totalMonths <= 120) step = 24;
  const ticks = [];
  for (let m = 0; m <= totalMonths; m += step) ticks.push(m);
  if (ticks[ticks.length - 1] !== totalMonths) ticks.push(totalMonths);
  return ticks;
}

export function formatMonthTick(month) {
  if (month === 0) return "Now";
  return month % 12 === 0 ? `Yr ${month / 12}` : `${month} mo`;
}

export function formatMonthLabel(month) {
  if (month === 0) return "Today";
  return `Month ${month} (${formatMonths(month)})`;
}

export function yearsText(years) {
  return `${years} ${years === 1 ? "year" : "years"}`;
}
