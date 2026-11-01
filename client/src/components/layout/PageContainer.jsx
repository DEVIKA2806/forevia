import styles from "./PageContainer.module.css";

/**
 * Every page's content should be wrapped in this rather than each page
 * defining its own max-width/padding — keeps spacing consistent across
 * the whole app and gives us one place to change it later.
 */
function PageContainer({ children }) {
  return <div className={styles.container}>{children}</div>;
}

export default PageContainer;
