import styles from "./Toggle.module.css";

/**
 * On/off switch, used for preferences like reminders. Built on a real
 * checkbox input under the hood (visually hidden) so it's keyboard-
 * operable and works with screen readers without extra ARIA plumbing.
 */
function Toggle({ id, label, checked, onChange, ...rest }) {
  return (
    <label htmlFor={id} className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.switchTrack}>
        <input
          type="checkbox"
          id={id}
          className={styles.input}
          checked={checked}
          onChange={onChange}
          {...rest}
        />
        <span className={styles.slider} aria-hidden="true" />
      </span>
    </label>
  );
}

export default Toggle;
