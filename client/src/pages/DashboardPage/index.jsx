import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import PageContainer from "../../components/layout/PageContainer";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { fetchHealthProfile, fetchWealthProfile } from "../../api/profiles";
import { fetchCalculationSummary } from "../../api/calculations";
import ProfileCompletionCard from "./ProfileCompletionCard";
import HealthSummaryCard from "./HealthSummaryCard";
import WealthSummaryCard from "./WealthSummaryCard";
import KeyInsightsCard from "./KeyInsightsCard";
import styles from "./DashboardPage.module.css";

function DashboardPage() {
  const { user } = useAuth();

  // null = still loading; an object = known state ({ health, wealth }
  // holding each profile or null). Kept as one piece of state so every
  // card on the page resolves together instead of flickering
  // independently as separate requests land.
  const [profiles, setProfiles] = useState(null);
  const [loadError, setLoadError] = useState("");
  // Deterministic metrics from the Phase 8 calculation API. Stays null if
  // the request fails: the insights card simply doesn't render, and the
  // rest of the dashboard is unaffected.
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Both GET requests go out together — this is already the minimum
    // number of calls the dashboard needs (one read per resource), so
    // there's nothing to consolidate further without inventing a combined
    // endpoint that doesn't otherwise exist in the API.
    // The calculation request is separate from the profile requests and
    // its failure is swallowed, so a calculation problem can never block
    // the profile cards from loading.
    Promise.all([
      fetchHealthProfile(),
      fetchWealthProfile(),
      fetchCalculationSummary().catch(() => null),
    ])
      .then(([health, wealth, calculations]) => {
        if (cancelled) return;
        setSummary(calculations);
        setProfiles({
          health: health.profile || null,
          wealth: wealth.profile || null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        // Never show the raw error — a short, friendly message instead.
        // Falling back to "no profile" state keeps the rest of the
        // dashboard usable rather than blocking the whole page.
        setProfiles({ health: null, wealth: null });
        setLoadError(
          error.status === 401
            ? "Your session has expired. Please sign in again."
            : "We couldn't load your saved information just now. You can still open each section below."
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name ? user.name.trim().split(" ")[0] : null;
  const isLoading = profiles === null;

  return (
    <PageContainer>
      <section className={styles.welcome}>
        <h2 className={styles.welcomeHeading}>
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h2>
        <p className={styles.welcomeText}>
          Forevia helps you explore how your health, lifestyle and financial
          choices could shape different possible futures. Keep your
          information up to date below.
        </p>
      </section>

      {isLoading ? (
        <Card padding="md">
          <p className={styles.statusText}>Loading profile…</p>
        </Card>
      ) : (
        <>
          {loadError && (
            <p role="status" className={styles.statusNotice}>
              {loadError}
            </p>
          )}

          <div className={styles.topGrid}>
            <ProfileCompletionCard
              healthProfile={profiles.health}
              wealthProfile={profiles.wealth}
            />

            {/* Deliberately no value and no action: the simulation engine
                that would produce this score isn't built yet, and an
                invented health or money figure would be misleading in a
                way that matters here. */}
            <Card padding="md">
              <div className={styles.futureScoreHeader}>
                <span className={styles.futureScoreIcon}>
                  <TrendingUp size={18} strokeWidth={1.75} />
                </span>
                <h3 className={styles.futureScoreTitle}>
                  Overall Future Score
                </h3>
              </div>
              <Badge tone="neutral">Coming soon</Badge>
              <p className={styles.futureScoreText}>
                Once the simulator is available, a combined view of your
                possible outcomes will appear here.
              </p>
            </Card>
          </div>

          <KeyInsightsCard summary={summary} />

          <div className={styles.summaryGrid}>
            <HealthSummaryCard profile={profiles.health} />
            <WealthSummaryCard profile={profiles.wealth} />
          </div>
        </>
      )}

      <section>
        <Card padding="md">
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          <EmptyState message="You haven't run any simulations yet. Your recent activity will show up here once you do." />
        </Card>
      </section>

      <p className={styles.disclaimer}>
        Forevia provides educational simulations and insights. It is not
        medical, financial or legal advice.
      </p>
    </PageContainer>
  );
}

export default DashboardPage;
