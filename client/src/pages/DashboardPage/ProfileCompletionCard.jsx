import Card from "../../components/ui/Card";
import ProgressBar from "../../components/ui/ProgressBar";
import Badge from "../../components/ui/Badge";
import {
  getHealthCompletion,
  getWealthCompletion,
  getOverallCompletion,
} from "../../utils/profileCompletion";
import styles from "./ProfileCompletionCard.module.css";

/**
 * Combines Feature 1 (completion percentage + progress bar) and Feature 4
 * (per-section Complete/Incomplete status) into a single card, since both
 * are really the same information at two levels of detail — showing them
 * as two separate cards would just repeat the same numbers.
 *
 * All percentages come from utils/profileCompletion.js, which counts
 * actual fields present on the fetched profile objects. Nothing here is
 * hardcoded.
 */
function ProfileCompletionCard({ healthProfile, wealthProfile }) {
  const health = getHealthCompletion(healthProfile);
  const wealth = getWealthCompletion(wealthProfile);
  const overall = getOverallCompletion(healthProfile, wealthProfile);

  return (
    <Card padding="md">
      <div className={styles.header}>
        <h3 className={styles.title}>Profile Completion</h3>
        <span className={styles.percent}>{overall}%</span>
      </div>

      <ProgressBar value={overall} />

      <div className={styles.statusList}>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Health Profile</span>
          <Badge tone={health.percent === 100 ? "success" : "neutral"}>
            {health.percent === 100 ? "Complete" : "Incomplete"}
          </Badge>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Wealth Profile</span>
          <Badge tone={wealth.percent === 100 ? "success" : "neutral"}>
            {wealth.percent === 100 ? "Complete" : "Incomplete"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

export default ProfileCompletionCard;
