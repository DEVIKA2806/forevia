import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import { fetchWealthProfile } from "../api/profiles";
import { fetchCalculationSummary } from "../api/calculations";
import {
  FINANCIAL_GOAL_LABELS,
  FINANCIAL_STATUS_LABELS,
  FINANCIAL_STATUS_TONES,
  labelFor,
} from "../constants/profileOptions";
import {
  formatCurrency,
  formatPercent,
  EMPTY_VALUE,
} from "../utils/formatters";
import styles from "./OverviewPage.module.css";

function errorMessage(error) {
  return error.status === 401
    ? "Your session has expired. Please sign in again."
    : "We couldn't load your financial information. Check your connection and try again.";
}

function DetailRows({ rows }) {
  return (
    <dl className={styles.rows}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.row}>
          <dt className={styles.rowLabel}>{label}</dt>
          <dd className={styles.rowValue}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const hasValue = (v) => v !== null && v !== undefined;

/**
 * Wealth Overview. Read-only: the profile is edited on /wealth-profile.
 * Raw amounts come from the saved WealthProfile; every derived figure
 * comes from the server's calculation service. No forecasts, scores or
 * product recommendations.
 */
function WealthPage() {
  // data === null while loading; otherwise { profile, metrics }.
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchWealthProfile(), fetchCalculationSummary()])
      .then(([profileResult, summary]) => {
        if (cancelled) return;
        setError("");
        setData({
          profile: profileResult.profile || null,
          metrics: summary.wealth || null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setError("");
    setData(null);
    setAttempt((n) => n + 1);
  }

  if (error) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message={error}
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (data === null) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.note}>Loading your wealth overview…</p>
        </Card>
      </PageContainer>
    );
  }

  const { profile, metrics } = data;

  if (!profile) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message="You haven't added your financial details yet. Complete your wealth profile to see your overview."
            action={
              <Link to="/wealth-profile" className={styles.editLink}>
                <Button size="sm">Complete Wealth Profile</Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const status = metrics?.financialStatus || "insufficient_data";
  const months = metrics?.emergencyFundMonths;
  const coverage = metrics?.emergencyFundCoverage;
  const surplus = metrics?.monthlySurplus;

  const goalRows = [
    ["Financial goal", labelFor(FINANCIAL_GOAL_LABELS, profile.financialGoal)],
  ];
  if (hasValue(profile.targetAmount)) {
    goalRows.push(["Target amount", formatCurrency(profile.targetAmount)]);
  }
  if (hasValue(profile.targetYears)) {
    goalRows.push(["Target time period", `${profile.targetYears} years`]);
  }

  return (
    <PageContainer>
      <div className={styles.intro}>
        <p className={styles.introText}>
          A snapshot of the financial details you've saved, with figures
          calculated from them. To change anything, edit your wealth profile.
        </p>
        <Link to="/wealth-profile" className={styles.editLink}>
          <Button variant="outline">Edit Wealth Profile</Button>
        </Link>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          label={
            hasValue(surplus) && surplus < 0
              ? "Monthly deficit"
              : "Monthly surplus"
          }
          value={formatCurrency(surplus)}
          supportingText="income minus expenses"
        />
        <StatCard
          label="Savings rate"
          value={formatPercent(metrics?.savingsRate)}
          supportingText={
            metrics?.savingsRate === null || !metrics
              ? "needs monthly income"
              : "of income"
          }
        />
        <StatCard
          label="Emergency fund"
          value={formatPercent(coverage)}
          supportingText={
            coverage === null || !metrics
              ? "needs monthly expenses"
              : "of target covered"
          }
        />
        <StatCard
          label="Investment rate"
          value={formatPercent(metrics?.investmentRate)}
          supportingText={
            metrics?.investmentRate === null || !metrics
              ? "needs monthly income"
              : "of income invested"
          }
        />
      </div>

      <div className={styles.detailGrid}>
        <Card padding="md">
          <h3 className={styles.cardTitle}>Monthly cash flow</h3>
          <div className={styles.statusRow}>
            <Badge tone={FINANCIAL_STATUS_TONES[status] || "neutral"}>
              {labelFor(FINANCIAL_STATUS_LABELS, status)}
            </Badge>
          </div>
          <DetailRows
            rows={[
              ["Monthly income", formatCurrency(profile.monthlyIncome)],
              ["Monthly expenses", formatCurrency(profile.monthlyExpenses)],
              [
                hasValue(surplus) && surplus < 0
                  ? "Monthly deficit"
                  : "Monthly surplus",
                formatCurrency(surplus),
              ],
              ["Expense ratio", formatPercent(metrics?.expenseRatio)],
              ["Monthly investment", formatCurrency(profile.monthlyInvestment)],
            ]}
          />
        </Card>

        <Card padding="md">
          <h3 className={styles.cardTitle}>Emergency fund</h3>
          <p className={styles.note}>
            Target is {months ?? EMPTY_VALUE} months of expenses.
          </p>
          <div className={styles.gapText}>
            <ProgressBar
              value={typeof coverage === "number" ? coverage : 0}
              label={
                typeof coverage === "number"
                  ? `${formatPercent(coverage)} covered`
                  : "Coverage not available"
              }
            />
          </div>
          <div className={styles.gapText}>
            <DetailRows
              rows={[
                ["Current savings", formatCurrency(profile.currentSavings)],
                ["Target", formatCurrency(metrics?.emergencyFundTarget)],
                ["Gap to target", formatCurrency(metrics?.emergencyFundGap)],
              ]}
            />
          </div>
        </Card>

        <Card padding="md">
          <h3 className={styles.cardTitle}>Savings, investments and debt</h3>
          <DetailRows
            rows={[
              ["Current savings", formatCurrency(profile.currentSavings)],
              [
                "Current investments",
                formatCurrency(profile.currentInvestments),
              ],
              ["Existing debt", formatCurrency(profile.existingDebt)],
            ]}
          />
          <p className={`${styles.note} ${styles.gapText}`}>
            Existing debt is the total outstanding amount. Forevia doesn't
            track monthly repayments, so no debt-to-income ratio is shown.
          </p>
        </Card>

        <Card padding="md">
          <h3 className={styles.cardTitle}>Goal</h3>
          <DetailRows rows={goalRows} />
        </Card>
      </div>

      <p className={styles.disclaimer}>
        Forevia provides educational information. It is not financial advice.
      </p>
    </PageContainer>
  );
}

export default WealthPage;
