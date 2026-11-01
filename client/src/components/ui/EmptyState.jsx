import styles from "./EmptyState.module.css";

/**
 * Shown where a feature has no data yet, or isn't built yet. Used several
 * times on the dashboard, so it lives here rather than being repeated per
 * card. Deliberately plain text — the point is to be honest that there's
 * nothing here yet, not to decorate the gap.
 */
function EmptyState({ message, action }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.message}>{message}</p>
      {action}
    </div>
  );
}

export default EmptyState;
