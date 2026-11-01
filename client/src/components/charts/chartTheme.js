/**
 * Shared color values for charts, pulled from the same palette as the rest
 * of the app (see styles/variables.css). Recharts needs actual color
 * strings (it can't read CSS variables directly in all cases), so this is
 * the one place those values are duplicated — future chart components
 * should import from here rather than hardcoding hex values themselves.
 */
export const chartColors = {
  primary: "#5b4fe8",
  success: "#1f9254",
  warning: "#b76e00",
  danger: "#c0392b",
  grid: "#e5e7eb",
  axisText: "#6b7280",
};
