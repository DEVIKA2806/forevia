import Card from "./Card";
import styles from "./StatCard.module.css";

/**
 * The repeated "label + big value + supporting line" pattern used across
 * Dashboard/Health/Wealth (e.g. "Health Score — 72 — Good"). Deliberately
 * simple: no gauges, no illustrations — just clear numbers, per the brief.
 */
function StatCard({ label, value, supportingText, trend }) {
  return (
    <Card padding="md" className={styles.card}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {(supportingText || trend) && (
        <p className={styles.supporting}>
          {trend && (
            <span
              className={[
                styles.trend,
                trend.direction === "down" ? styles.trendDown : styles.trendUp,
              ].join(" ")}
            >
              {trend.direction === "down" ? "▼" : "▲"} {trend.value}
            </span>
          )}
          {supportingText && <span>{supportingText}</span>}
        </p>
      )}
    </Card>
  );
}

export default StatCard;
