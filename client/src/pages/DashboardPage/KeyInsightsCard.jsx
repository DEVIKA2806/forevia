import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
} from "../../utils/formatters";
import { BMI_CATEGORY_LABELS, labelFor } from "../../constants/profileOptions";
import styles from "./KeyInsightsCard.module.css";

/**
 * Four headline numbers from /api/calculations/summary. Purely
 * descriptive of what the user has saved: no score, no forecast. Each
 * stat only appears when its source profile exists, so a user who has
 * only filled in one profile sees only the relevant numbers.
 */
function KeyInsightsCard({ summary }) {
  const wealth = summary?.wealth;
  const health = summary?.health;

  const stats = [];

  if (wealth) {
    const deficit = typeof wealth.monthlySurplus === "number" && wealth.monthlySurplus < 0;
    stats.push(
      <StatCard
        key="surplus"
        label={deficit ? "Monthly deficit" : "Monthly surplus"}
        value={formatCurrency(wealth.monthlySurplus)}
      />,
      <StatCard
        key="savingsRate"
        label="Savings rate"
        value={formatPercent(wealth.savingsRate)}
        supportingText={wealth.savingsRate === null ? "needs monthly income" : undefined}
      />,
      <StatCard
        key="emergency"
        label="Emergency fund"
        value={formatPercent(wealth.emergencyFundCoverage)}
        supportingText={
          wealth.emergencyFundCoverage === null
            ? "needs monthly expenses"
            : "of target covered"
        }
      />
    );
  }

  if (health) {
    stats.push(
      <StatCard
        key="bmi"
        label="BMI"
        value={formatNumber(health.bmi)}
        supportingText={
          health.bmiCategory
            ? labelFor(BMI_CATEGORY_LABELS, health.bmiCategory)
            : undefined
        }
      />
    );
  }

  if (stats.length === 0) return null;

  return (
    <section>
      <Card padding="md">
        <h3 className={styles.title}>Key Insights</h3>
        <p className={styles.subtitle}>Calculated from your saved profiles.</p>
        <div className={styles.grid}>{stats}</div>
      </Card>
    </section>
  );
}

export default KeyInsightsCard;
