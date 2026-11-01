import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { fetchHealthProfile, fetchWealthProfile } from "../api/profiles";
import { generateInsights } from "../api/insights";
import styles from "./AIGuidePage.module.css";

const SECTIONS = [
  ["keyObservations", "Key observations"],
  ["financialInsights", "Financial insights"],
  ["healthInsights", "Health and lifestyle insights"],
  ["nextSteps", "Suggested next steps"],
];

// Messages for failures that have a fixed meaning. For anything else the
// server's own (user-safe) message is shown.
function generationErrorMessage(error) {
  if (error.status === 401) return "Your session has expired. Please sign in again.";
  if (error.status === 409) {
    return "Add your health or wealth details first so there is something to analyse.";
  }
  // 429, 502, 503, 504: the server's message already says what happened.
  if ([429, 502, 503, 504].includes(error.status) && error.message) {
    return error.message;
  }
  return "We couldn't generate insights right now. Please try again.";
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/**
 * AI Insights.
 *
 * Profiles are read once, only to decide which state to show (the server
 * re-checks everything). Insights are generated on demand when the user
 * asks, never automatically, kept in component state only, and not saved
 * anywhere: leaving the page discards them.
 */
function AIGuidePage() {
  // saved === null while loading; otherwise { health, wealth } booleans.
  const [saved, setSaved] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [result, setResult] = useState(null); // { insights, missing, generatedAt }
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchHealthProfile(), fetchWealthProfile()])
      .then(([health, wealth]) => {
        if (cancelled) return;
        setLoadError("");
        setSaved({ health: Boolean(health.profile), wealth: Boolean(wealth.profile) });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error.status === 401
            ? "Your session has expired. Please sign in again."
            : "We couldn't load your saved information. Check your connection and try again."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retryLoad() {
    setLoadError("");
    setSaved(null);
    setAttempt((n) => n + 1);
  }

  async function handleGenerate() {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenError("");
    try {
      const data = await generateInsights();
      if (!mounted.current) return;
      setResult(data);
    } catch (error) {
      if (!mounted.current) return;
      setGenError(generationErrorMessage(error));
    } finally {
      if (mounted.current) setIsGenerating(false);
    }
  }

  if (loadError) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message={loadError}
            action={
              <Button variant="outline" size="sm" onClick={retryLoad}>
                Try again
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (saved === null) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.note}>Loading your saved information…</p>
        </Card>
      </PageContainer>
    );
  }

  if (!saved.health && !saved.wealth) {
    return (
      <PageContainer>
        <Card padding="md">
          <h3 className={styles.heading}>AI Insights</h3>
          <EmptyState
            message="Add your health and financial details first. Insights are built from the information in your profiles."
            action={
              <div className={styles.actions}>
                <Link to="/health-profile" className={styles.plainLink}>
                  <Button size="sm">Complete Health Profile</Button>
                </Link>
                <Link to="/wealth-profile" className={styles.plainLink}>
                  <Button size="sm" variant="outline">
                    Complete Wealth Profile
                  </Button>
                </Link>
              </div>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const notUsed = result ? result.missing : [];
  const missingNow = [
    !saved.health && { name: "health", to: "/health-profile", label: "Complete Health Profile" },
    !saved.wealth && { name: "wealth", to: "/wealth-profile", label: "Complete Wealth Profile" },
  ].filter(Boolean);

  return (
    <PageContainer>
      <div className={styles.intro}>
        <div>
          <h3 className={styles.heading}>AI Insights</h3>
          <p className={styles.introText}>
            Plain-language observations about the health and financial details
            you've saved, based on figures Forevia has already calculated. Only
            those figures are used. Your name, email and notes are not shared.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating
            ? "Generating…"
            : result
              ? "Refresh Insights"
              : "Generate Insights"}
        </Button>
      </div>

      {missingNow.length > 0 && (
        <p className={styles.notice}>
          Your {missingNow.map((m) => m.name).join(" and ")} profile isn't filled in
          yet, so insights will cover only the other area.{" "}
          {missingNow.map((m) => (
            <Link key={m.name} to={m.to}>
              {m.label}
            </Link>
          ))}
        </p>
      )}

      {isGenerating && (
        <Card padding="md">
          <p role="status" className={styles.note}>
            Generating your insights. This can take a few seconds.
          </p>
        </Card>
      )}

      {genError && (
        <p role="alert" className={styles.error}>
          {genError}
        </p>
      )}

      {result && (
        <div className={styles.results} aria-live="polite" aria-busy={isGenerating}>
          {SECTIONS.map(([key, title]) => {
            const items = result.insights?.[key];
            if (!Array.isArray(items) || items.length === 0) return null;
            return (
              <Card key={key} padding="md">
                <h3 className={styles.sectionTitle}>{title}</h3>
                <ul className={styles.list}>
                  {items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Card>
            );
          })}
          <p className={styles.meta}>
            Generated at {formatTime(result.generatedAt)}
            {notUsed.length > 0 ? `. Your ${notUsed.join(" and ")} profile wasn't used.` : "."}
          </p>
        </div>
      )}

      {!result && !isGenerating && !genError && (
        <Card padding="md">
          <p className={styles.note}>
            Select Generate Insights to see observations based on your current
            profiles. Nothing is generated or stored until you ask.
          </p>
        </Card>
      )}

      <p className={styles.disclaimer}>
        Insights are generated by AI from the numbers you entered. They are
        general information, not medical advice, a diagnosis, or personalised
        financial or investment advice, and they cannot predict the future.
        For decisions about your health or money, speak to a qualified doctor
        or financial professional.
      </p>
    </PageContainer>
  );
}

export default AIGuidePage;
