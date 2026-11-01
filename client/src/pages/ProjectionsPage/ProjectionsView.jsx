import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageContainer from "../../components/layout/PageContainer";
import {
  CashFlowCharts,
  IndicatorCards,
  EmergencyFundOverview,
} from "./FinancialCharts";
import {
  ProjectionControls,
  SavingsProjection,
  EmergencyFundProjection,
} from "./SavingsProjection";
import { HealthCharts } from "./HealthCharts";
import overview from "../OverviewPage.module.css";
import styles from "./ProjectionsPage.module.css";

function MissingProfile({ message, to, action }) {
  return (
    <Card padding="md">
      <EmptyState
        message={message}
        action={
          <Link to={to} className={overview.editLink}>
            <Button size="sm">{action}</Button>
          </Link>
        }
      />
    </Card>
  );
}

/**
 * Everything on the Charts & Projections page once data has loaded.
 * Purely presentational: the container (index.jsx) owns fetching and the
 * selected settings, which keeps this easy to render in any state.
 */
function ProjectionsView({ data, error, years, annualReturn, onYears, onReturn }) {
  const { wealth, health, assumptions } = data;
  // The figures on screen are for the settings the server last answered;
  // the selectors may already show newer ones while a request is running.
  const isUpdating =
    assumptions.years !== years ||
    assumptions.annualReturnPercent !== annualReturn;

  return (
    <PageContainer>
      <p className={overview.introText}>
        Charts and projections built from the details saved in your profiles.
        Forevia doesn't keep past months or past health readings, so these
        show your current snapshot and projections, not history.
      </p>

      {error && (
        <p role="alert" className={overview.notice}>
          {error} Showing the last results that loaded.
        </p>
      )}

      {!wealth && !health && (
        <Card padding="md">
          <EmptyState
            message="You haven't added your financial or health details yet. Complete your profiles to see charts and projections."
            action={
              <div className={styles.actions}>
                <Link to="/wealth-profile" className={overview.editLink}>
                  <Button size="sm">Complete Wealth Profile</Button>
                </Link>
                <Link to="/health-profile" className={overview.editLink}>
                  <Button size="sm" variant="outline">
                    Complete Health Profile
                  </Button>
                </Link>
              </div>
            }
          />
        </Card>
      )}

      {wealth ? (
        <>
          <section className={styles.section} aria-labelledby="fin-heading">
            <h2 id="fin-heading" className={styles.sectionHeading}>
              Financial overview
            </h2>
            <CashFlowCharts snapshot={wealth.snapshot} />
            <IndicatorCards snapshot={wealth.snapshot} />
            <EmergencyFundOverview emergency={wealth.emergencyFund} />
          </section>

          <section className={styles.section} aria-labelledby="proj-heading">
            <h2 id="proj-heading" className={styles.sectionHeading}>
              Projections
            </h2>
            <Card padding="md">
              <ProjectionControls
                years={years}
                annualReturn={annualReturn}
                onYears={onYears}
                onReturn={onReturn}
              />
            </Card>
            <div className={styles.section} aria-busy={isUpdating} aria-live="polite">
              {isUpdating && (
                <p className={overview.note}>Updating projections…</p>
              )}
              <SavingsProjection
                snapshot={wealth.snapshot}
                projection={wealth.projection}
                assumptions={assumptions}
              />
              <EmergencyFundProjection
                emergency={wealth.emergencyFund}
                projection={wealth.projection}
                assumptions={assumptions}
              />
            </div>
          </section>
        </>
      ) : (
        health && (
          <MissingProfile
            message="Add your financial details to see income, savings and emergency-fund charts and projections."
            to="/wealth-profile"
            action="Complete Wealth Profile"
          />
        )
      )}

      {health ? (
        <section className={styles.section} aria-labelledby="health-heading">
          <h2 id="health-heading" className={styles.sectionHeading}>
            Health indicators
          </h2>
          <HealthCharts health={health} />
        </section>
      ) : (
        wealth && (
          <MissingProfile
            message="Add your health details to see BMI, sleep and activity charts."
            to="/health-profile"
            action="Complete Health Profile"
          />
        )
      )}

      <p className={overview.disclaimer}>
        Forevia provides educational projections based on the numbers you
        enter. They are not predictions of your future wealth or health, and
        this is not financial or medical advice.
      </p>
    </PageContainer>
  );
}

export default ProjectionsView;
