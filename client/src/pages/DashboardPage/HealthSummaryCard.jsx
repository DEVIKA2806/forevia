import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import {
  ACTIVITY_LEVEL_LABELS,
  SMOKING_STATUS_LABELS,
  ALCOHOL_USE_LABELS,
  GENDER_LABELS,
  labelFor,
} from "../../constants/profileOptions";
import styles from "./SummaryCard.module.css";

/**
 * Every row here maps directly to a field that exists on the Phase 6
 * HealthProfile model (age, gender, heightCm, weightKg, activityLevel,
 * smokingStatus, alcoholUse, conditions) — nothing invented. Units match
 * how the value is actually stored (cm, kg), rather than converting to
 * other units, to avoid introducing a conversion bug.
 */
function HealthSummaryCard({ profile }) {
  if (!profile) {
    return (
      <Card padding="md">
        <div className={styles.header}>
          <span className={styles.icon}>
            <HeartPulse size={18} strokeWidth={1.75} />
          </span>
          <h3 className={styles.title}>Health Overview</h3>
        </div>
        <EmptyState
          message="Complete your health profile to see your health overview."
          action={
            <Link to="/health-profile">
              <Button variant="outline" size="sm">
                Complete Health Profile
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const rows = [
    ["Age", profile.age],
    ["Gender", labelFor(GENDER_LABELS, profile.gender)],
    ["Height", `${profile.heightCm} cm`],
    ["Weight", `${profile.weightKg} kg`],
    ["Activity level", labelFor(ACTIVITY_LEVEL_LABELS, profile.activityLevel)],
    ["Sleep", `${profile.sleepHours} hrs/night`],
    ["Smoking", labelFor(SMOKING_STATUS_LABELS, profile.smokingStatus)],
    ["Alcohol", labelFor(ALCOHOL_USE_LABELS, profile.alcoholUse)],
  ];

  // Optional field — only shown when the user actually entered something.
  if (profile.conditions) {
    rows.push(["Medical history", profile.conditions]);
  }

  return (
    <Card padding="md">
      <div className={styles.header}>
        <span className={styles.icon}>
          <HeartPulse size={18} strokeWidth={1.75} />
        </span>
        <h3 className={styles.title}>Health Overview</h3>
      </div>

      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt className={styles.rowLabel}>{label}</dt>
            <dd className={styles.rowValue}>{value}</dd>
          </div>
        ))}
      </dl>

      <Link to="/health-profile" className={styles.editLink}>
        <Button variant="outline" size="sm">
          Edit Health Profile
        </Button>
      </Link>
    </Card>
  );
}

export default HealthSummaryCard;
