import { Rectangle } from "recharts";
import ChartCard from "../../components/charts/ChartCard";
import { chartColors } from "../../components/charts/chartTheme";
import overview from "../OverviewPage.module.css";
import styles from "./ProjectionsPage.module.css";

/**
 * Bar shape that takes its colour from the data row's `fill`, so one Bar
 * can show differently coloured bars (e.g. green surplus, red deficit).
 * Uses Bar's `shape` prop, which replaces the deprecated <Cell>.
 */
export function ColoredBar(props) {
  const fill = props.payload && props.payload.fill ? props.payload.fill : props.fill;
  return <Rectangle {...props} fill={fill} />;
}

/**
 * Legend labels in neutral grey instead of each series' own colour: the
 * swatch next to the label already carries the colour, and pale series
 * colours (like the lightest BMI band) are unreadable as text.
 */
export function legendFormatter(value) {
  return <span style={{ color: chartColors.axisText }}>{value}</span>;
}

export const tooltipStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 13,
};

/**
 * A chart inside the existing ChartCard, exposed to screen readers as one
 * image with a text description. The same numbers are always printed as
 * text next to the chart, so nothing depends on colour or on hovering.
 */
export function ChartFigure({ title, description, height, children }) {
  return (
    <figure className={styles.figure} role="img" aria-label={`${title}. ${description}`}>
      <ChartCard title={title} height={height}>
        {children}
      </ChartCard>
    </figure>
  );
}

/** Label / value list, same look as the Health and Wealth overview pages. */
export function DetailRows({ rows }) {
  return (
    <dl className={overview.rows}>
      {rows.map(([label, value]) => (
        <div key={label} className={overview.row}>
          <dt className={overview.rowLabel}>{label}</dt>
          <dd className={overview.rowValue}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
