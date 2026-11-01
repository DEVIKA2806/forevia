import { useEffect, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { fetchProjections } from "../../api/projections";
import { DEFAULT_YEARS } from "./chartHelpers";
import ProjectionsView from "./ProjectionsView";
import overview from "../OverviewPage.module.css";

function errorMessage(error) {
  return error.status === 401
    ? "Your session has expired. Please sign in again."
    : "We couldn't load your charts. Check your connection and try again.";
}

/**
 * Charts & Projections.
 *
 * Read-only. Everything shown is calculated on the server from the
 * signed-in user's SAVED profiles (GET /api/calculations/projections);
 * nothing is calculated here except display formatting, and nothing is
 * saved. It never calls the AI provider, so it works when AI Insights is
 * unavailable. Forevia stores no history, so the charts show a current
 * snapshot and projections, never past trends.
 */
function ProjectionsPage() {
  const [years, setYears] = useState(DEFAULT_YEARS);
  const [annualReturn, setAnnualReturn] = useState(0);
  // data === null until the first successful load.
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchProjections({ years, annualReturn })
      .then((result) => {
        if (cancelled) return;
        setError("");
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [years, annualReturn, attempt]);

  function retry() {
    setError("");
    setData(null);
    setAttempt((n) => n + 1);
  }

  if (data === null && error) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message={error}
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (data === null) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={overview.note}>Loading your charts…</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <ProjectionsView
      data={data}
      error={error}
      years={years}
      annualReturn={annualReturn}
      onYears={setYears}
      onReturn={setAnnualReturn}
    />
  );
}

export default ProjectionsPage;
