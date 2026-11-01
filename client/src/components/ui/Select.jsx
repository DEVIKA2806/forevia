import styles from "./Input.module.css";

/**
 * Select field. Reuses Input's CSS module on purpose — same label/error
 * layout, same field styling — so a form row of inputs and selects looks
 * consistent without duplicating styles.
 */
function Select({ id, label, error, description, children, ...rest }) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={[styles.input, error ? styles.inputError : ""].join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        {children}
      </select>
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

export default Select;
