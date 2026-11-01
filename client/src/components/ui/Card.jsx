import styles from "./Card.module.css";

/**
 * Base card shell used across the app: white surface, subtle border and
 * shadow, consistent padding. Compose it with other components rather than
 * creating one-off card styles per page.
 */
function Card({ children, className = "", padding = "md", ...rest }) {
  const classNames = [styles.card, styles[`padding-${padding}`], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
}

export default Card;
