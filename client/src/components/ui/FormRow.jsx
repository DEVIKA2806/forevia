import styles from "./FormRow.module.css";

/**
 * Lays out form fields side by side on desktop (e.g. First Name | Last
 * Name). Just a grid wrapper — the actual fields (Input/Select/etc.) are
 * passed in as children. Kept separate from responsive behavior on
 * purpose; that gets adjusted in the responsive-design phase.
 */
function FormRow({ children, columns = 2 }) {
  return (
    <div className={styles.row} style={{ "--columns": columns }}>
      {children}
    </div>
  );
}

export default FormRow;
