import styles from "./Badge.module.css";

const STATUS_TONE = {
  "on-track": "success",
  completed: "success",
  "needs-focus": "warning",
  behind: "danger",
};

/**
 * Small status label. Pass either a known `status` (maps to a muted color)
 * or an explicit `tone` for anything custom. Kept intentionally plain —
 * this is information, not decoration.
 */
function Badge({ children, status, tone }) {
  const resolvedTone = tone || STATUS_TONE[status] || "neutral";
  return (
    <span className={[styles.badge, styles[resolvedTone]].join(" ")}>
      {children}
    </span>
  );
}

export default Badge;
