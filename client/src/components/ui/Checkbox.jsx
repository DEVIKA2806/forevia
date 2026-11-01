import styles from "./Checkbox.module.css";

/**
 * Checkbox with the label wired to the input via a real <label htmlFor>,
 * so clicking the text also toggles the box and screen readers announce
 * it correctly.
 *
 * `error` follows the same pattern as Input's error prop, so validation
 * (e.g. an unchecked "I agree to Terms") renders consistently across forms.
 */
function Checkbox({ id, label, error, ...rest }) {
  return (
    <div className={styles.field}>
      <div className={styles.wrapper}>
        <input
          type="checkbox"
          id={id}
          className={styles.checkbox}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Checkbox;
