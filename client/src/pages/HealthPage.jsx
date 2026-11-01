import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import { fetchHealthProfile } from "../api/profiles";
import { fetchCalculationSummary } from "../api/calculations";
import {
  ACTIVITY_LEVEL_LABELS,
  SMOKING_STATUS_LABELS,
  ALCOHOL_USE_LABELS,
  GENDER_LABELS,
  BMI_CATEGORY_LABELS,
  labelFor,
} from "../constants/profileOptions";
import { formatNumber, EMPTY_VALUE } from "../utils/formatters";
import styles from "./OverviewPage.module.css";

function errorMessage(error) {
  return error.status === 401
    ? "Your session has expired. Please sign in again."
    : "We couldn't load your health information. Check your connection and try again.";
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

/**
 * Health Overview. Read-only: the profile is edited on /health-profile.
 * Raw values come from the saved HealthProfile; BMI and its category come
 * from the server's calculation service (nothing is calculated here).
 * Descriptive only: no score, risk estimate or advice.
 */
function HealthPage() {
  // data === null while loading; otherwise { profile, metrics }.
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchHealthProfile(), fetchCalculationSummary()])
      .then(([profileResult, summary]) => {
        if (cancelled) return;
        setError("");
        setData({
          profile: profileResult.profile || null,
          metrics: summary.health || null,
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
          <p className={styles.note}>Loading your health overview…</p>
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
            message="You haven't added your health details yet. Complete your health profile to see your overview."
            action={
              <Link to="/health-profile" className={styles.editLink}>
                <Button size="sm">Complete Health Profile</Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const bmiSupporting = metrics?.bmiCategory
    ? labelFor(BMI_CATEGORY_LABELS, metrics.bmiCategory)
    : metrics && metrics.bmi !== null && !metrics.bmiCategoryApplicable
      ? "Adult categories don't apply under 18"
      : undefined;

  return (
    <PageContainer>
      <div className={styles.intro}>
        <p className={styles.introText}>
          A snapshot of the health and lifestyle details you've saved. To
          change anything, edit your health profile.
        </p>
        <Link to="/health-profile" className={styles.editLink}>
          <Button variant="outline">Edit Health Profile</Button>
        </Link>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          label="BMI"
          value={formatNumber(metrics?.bmi)}
          supportingText={bmiSupporting}
        />
        <StatCard
          label="Sleep"
          value={
            profile.sleepHours === null || profile.sleepHours === undefined
              ? EMPTY_VALUE
              : `${formatNumber(profile.sleepHours)} hrs`
          }
          supportingText="per night"
        />
        <StatCard
          label="Activity level"
          value={labelFor(ACTIVITY_LEVEL_LABELS, profile.activityLevel)}
        />
      </div>

      <p className={styles.note}>
        BMI is a general screening measure based on height and weight. It
        doesn't account for muscle, age or body composition, and it is not a
        diagnosis.
      </p>

      <div className={styles.detailGrid}>
        <Card padding="md">
          <h3 className={styles.cardTitle}>Personal details</h3>
          <DetailRows
            rows={[
              ["Age", `${profile.age} years`],
              ["Gender", labelFor(GENDER_LABELS, profile.gender)],
              ["Height", `${formatNumber(profile.heightCm)} cm`],
              ["Weight", `${formatNumber(profile.weightKg)} kg`],
            ]}
          />
        </Card>

        <Card padding="md">
          <h3 className={styles.cardTitle}>Lifestyle</h3>
          <DetailRows
            rows={[
              [
                "Smoking",
                labelFor(SMOKING_STATUS_LABELS, profile.smokingStatus),
              ],
              ["Alcohol", labelFor(ALCOHOL_USE_LABELS, profile.alcoholUse)],
            ]}
          />
        </Card>
      </div>

      {(profile.conditions || profile.healthGoals) && (
        <Card padding="md">
          {profile.conditions && (
            <div className={styles.freeTextBlock}>
              <h3 className={styles.cardTitle}>Medical conditions</h3>
              <p className={styles.freeText}>{profile.conditions}</p>
            </div>
          )}
          {profile.healthGoals && (
            <div className={styles.freeTextBlock}>
              <h3 className={styles.cardTitle}>Health goals</h3>
              <p className={styles.freeText}>{profile.healthGoals}</p>
            </div>
          )}
        </Card>
      )}

      <p className={styles.disclaimer}>
        Forevia provides educational information. It is not medical advice.
      </p>
    </PageContainer>
  );
}

export default HealthPage;
