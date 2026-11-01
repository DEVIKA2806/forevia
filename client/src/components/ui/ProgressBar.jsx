import styles from "./ProgressBar.module.css";

/**
 * Simple, static progress bar (0-100). No animated fill effects — the
 * brief explicitly asks for calm, non-flashy progress indicators.
 */
function ProgressBar({ value, max = 100, label }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={styles.wrapper}>
      {label && <p className={styles.label}>{label}</p>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
