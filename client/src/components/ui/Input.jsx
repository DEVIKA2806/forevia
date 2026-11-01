import styles from "./Input.module.css";

/**
 * Text input with a visible label (never rely on placeholder alone) and an
 * optional error message area, so validation state has a consistent place
 * to render across every form in the app.
 *
 * `endAdornment` renders an element (typically an icon button) inside the
 * right edge of the field — added for the password show/hide toggle used
 * on Login/Signup, but generic enough for any future field that needs it.
 */
function Input({ id, label, error, description, endAdornment, ...rest }) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={id}
          className={[
            styles.input,
            endAdornment ? styles.inputWithAdornment : "",
            error ? styles.inputError : "",
          ].join(" ")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {endAdornment && (
          <span className={styles.adornment}>{endAdornment}</span>
        )}
      </div>
      {description && !error && (
        <p className={styles.description}>{description}</p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
