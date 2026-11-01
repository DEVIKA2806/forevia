import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { FINANCIAL_GOAL_LABELS, labelFor } from "../../constants/profileOptions";
import styles from "./SummaryCard.module.css";

// en-IN grouping (₹1,00,000 style) to match the currency formatting used
// elsewhere in the app's design reference.
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

/**
 * Every row maps directly to a field on the Phase 6 WealthProfile model
 * (monthlyIncome, monthlyExpenses, currentSavings, currentInvestments,
 * existingDebt, monthlyInvestment, financialGoal, targetAmount,
 * targetYears) — nothing invented, no "insurance" or "emergency fund"
 * fields since those don't exist on the current schema.
 */
function WealthSummaryCard({ profile }) {
  if (!profile) {
    return (
      <Card padding="md">
        <div className={styles.header}>
          <span className={styles.icon}>
            <Wallet size={18} strokeWidth={1.75} />
          </span>
          <h3 className={styles.title}>Wealth Overview</h3>
        </div>
        <EmptyState
          message="Complete your wealth profile to see your financial overview."
          action={
            <Link to="/wealth-profile">
              <Button variant="outline" size="sm">
                Complete Wealth Profile
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const rows = [
    ["Monthly income", formatCurrency(profile.monthlyIncome)],
    ["Monthly expenses", formatCurrency(profile.monthlyExpenses)],
    ["Current savings", formatCurrency(profile.currentSavings)],
    ["Current investments", formatCurrency(profile.currentInvestments)],
    ["Existing debt", formatCurrency(profile.existingDebt)],
    ["Monthly investment", formatCurrency(profile.monthlyInvestment)],
    ["Financial goal", labelFor(FINANCIAL_GOAL_LABELS, profile.financialGoal)],
  ];

  // Optional fields — only shown when actually provided.
  if (profile.targetAmount !== null && profile.targetAmount !== undefined) {
    rows.push(["Target amount", formatCurrency(profile.targetAmount)]);
  }
  if (profile.targetYears !== null && profile.targetYears !== undefined) {
    rows.push(["Target time period", `${profile.targetYears} years`]);
  }

  return (
    <Card padding="md">
      <div className={styles.header}>
        <span className={styles.icon}>
          <Wallet size={18} strokeWidth={1.75} />
        </span>
        <h3 className={styles.title}>Wealth Overview</h3>
      </div>

      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt className={styles.rowLabel}>{label}</dt>
            <dd className={styles.rowValue}>{value}</dd>
          </div>
        ))}
      </dl>

      <Link to="/wealth-profile" className={styles.editLink}>
        <Button variant="outline" size="sm">
          Edit Wealth Profile
        </Button>
      </Link>
    </Card>
  );
}

export default WealthSummaryCard;
