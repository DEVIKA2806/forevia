import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import styles from "./PlaceholderPage.module.css";

/**
 * Used by every route that isn't built yet. Exists only to verify routing
 * and the AppLayout shell work correctly — deliberately does not contain
 * any fake data or charts.
 */
function PlaceholderPage({ message }) {
  return (
    <PageContainer>
      <Card>
        <p className={styles.message}>{message}</p>
      </Card>
    </PageContainer>
  );
}

export default PlaceholderPage;
