// Display formatting for calculated values. Every helper returns a plain
// dash for null/undefined/non-finite input, so a metric the server couldn't
// calculate never shows as "NaN" or "null".
export const EMPTY_VALUE = "—";

// en-IN grouping (₹1,00,000 style), matching the existing wealth card.
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatCurrency(value) {
  return isNumber(value) ? currencyFormatter.format(value) : EMPTY_VALUE;
}

export function formatPercent(value) {
  return isNumber(value) ? `${percentFormatter.format(value)}%` : EMPTY_VALUE;
}

export function formatNumber(value, maximumFractionDigits = 1) {
  return isNumber(value)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value)
    : EMPTY_VALUE;
}
