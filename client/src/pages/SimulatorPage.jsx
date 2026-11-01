import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import FormRow from "../components/ui/FormRow";
import EmptyState from "../components/ui/EmptyState";
import { fetchHealthProfile, fetchWealthProfile } from "../api/profiles";
import { simulateScenario } from "../api/simulator";
import {
  ACTIVITY_LEVEL_LABELS,
  BMI_CATEGORY_LABELS,
  FINANCIAL_STATUS_LABELS,
  labelFor,
} from "../constants/profileOptions";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  EMPTY_VALUE,
} from "../utils/formatters";
import {
  PERIOD_OPTIONS,
  initialScenario,
  validateScenario,
  isScenarioChanged,
} from "../utils/simulatorInputs";
import styles from "./SimulatorPage.module.css";

const DEBOUNCE_MS = 300;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// ---- "Change" column helpers. Sign and words, never colour alone. ----
function signed(diff, format) {
  if (diff === 0) return "No change";
  return `${diff > 0 ? "+" : "-"}${format(Math.abs(diff))}`;
}

function changeCurrency(a, b) {
  return isNum(a) && isNum(b)
    ? signed(Math.round((b - a) * 100) / 100, formatCurrency)
    : EMPTY_VALUE;
}

function changePoints(a, b) {
  return isNum(a) && isNum(b)
    ? signed(Math.round((b - a) * 10) / 10, (v) => `${formatNumber(v)} pts`)
    : EMPTY_VALUE;
}

function changeUnit(a, b, unit) {
  return isNum(a) && isNum(b)
    ? signed(Math.round((b - a) * 10) / 10, (v) => `${formatNumber(v)} ${unit}`)
    : EMPTY_VALUE;
}

function changeText(a, b) {
  return a === b ? "No change" : "Changed";
}

/**
 * One comparison table: rows are [label, current, what-if, change],
 * grouped under headings. On narrow screens each row stacks (see the
 * CSS), so the page never scrolls sideways.
 */
function ComparisonTable({ caption, groups }) {
  return (
    // Explicit roles: on small screens the CSS changes the display type of
    // the table elements, which makes browsers drop their table semantics.
    // The roles keep it a table for screen readers at every width.
    <table className={styles.table} role="table">
      <caption className={styles.srOnly}>{caption}</caption>
      <thead className={styles.srOnlyMobile} role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Measure
          </th>
          <th scope="col" role="columnheader">
            Current
          </th>
          <th scope="col" role="columnheader">
            What-if
          </th>
          <th scope="col" role="columnheader">
            Change
          </th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.title} role="rowgroup">
          <tr className={styles.groupRow} role="row">
            <th scope="colgroup" colSpan={4} role="columnheader">
              {group.title}
            </th>
          </tr>
          {group.rows.map(([label, current, scenario, change]) => (
            <tr key={label} className={styles.dataRow} role="row">
              <th scope="row" role="rowheader">
                {label}
              </th>
              <td data-label="Current" role="cell">
                {current}
              </td>
              <td data-label="What-if" role="cell">
                {scenario}
              </td>
              <td data-label="Change" role="cell">
                {change}
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

function financialGroups(saved, applied, data) {
  const cur = data.current;
  const scn = data.scenario;
  const sav = saved;
  const app = applied.wealth;
  const deficit = isNum(scn.monthlySurplus) && scn.monthlySurplus < 0;
  const curDeficit = isNum(cur.monthlySurplus) && cur.monthlySurplus < 0;
  const surplusLabel =
    deficit || curDeficit ? "Monthly surplus / deficit" : "Monthly surplus";
  const years = data.years;

  return [
    {
      title: "Monthly cash flow",
      rows: [
        [
          "Monthly income",
          formatCurrency(sav.monthlyIncome),
          formatCurrency(app.monthlyIncome),
          changeCurrency(sav.monthlyIncome, app.monthlyIncome),
        ],
        [
          "Monthly expenses",
          formatCurrency(sav.monthlyExpenses),
          formatCurrency(app.monthlyExpenses),
          changeCurrency(sav.monthlyExpenses, app.monthlyExpenses),
        ],
        [
          surplusLabel,
          formatCurrency(cur.monthlySurplus),
          formatCurrency(scn.monthlySurplus),
          changeCurrency(cur.monthlySurplus, scn.monthlySurplus),
        ],
        [
          "Savings rate",
          formatPercent(cur.savingsRate),
          formatPercent(scn.savingsRate),
          changePoints(cur.savingsRate, scn.savingsRate),
        ],
        [
          "Monthly investment",
          formatCurrency(sav.monthlyInvestment),
          formatCurrency(app.monthlyInvestment),
          changeCurrency(sav.monthlyInvestment, app.monthlyInvestment),
        ],
        [
          "Investment rate",
          formatPercent(cur.investmentRate),
          formatPercent(scn.investmentRate),
          changePoints(cur.investmentRate, scn.investmentRate),
        ],
        [
          "Cash flow status",
          labelFor(FINANCIAL_STATUS_LABELS, cur.financialStatus),
          labelFor(FINANCIAL_STATUS_LABELS, scn.financialStatus),
          changeText(cur.financialStatus, scn.financialStatus),
        ],
      ],
    },
    {
      title: "Emergency fund",
      rows: [
        [
          "Current savings",
          formatCurrency(sav.currentSavings),
          formatCurrency(app.currentSavings),
          changeCurrency(sav.currentSavings, app.currentSavings),
        ],
        [
          "Target",
          formatCurrency(cur.emergencyFundTarget),
          formatCurrency(scn.emergencyFundTarget),
          changeCurrency(cur.emergencyFundTarget, scn.emergencyFundTarget),
        ],
        [
          "Coverage",
          formatPercent(cur.emergencyFundCoverage),
          formatPercent(scn.emergencyFundCoverage),
          changePoints(cur.emergencyFundCoverage, scn.emergencyFundCoverage),
        ],
        [
          "Gap to target",
          formatCurrency(cur.emergencyFundGap),
          formatCurrency(scn.emergencyFundGap),
          changeCurrency(cur.emergencyFundGap, scn.emergencyFundGap),
        ],
      ],
    },
    {
      title: `After ${years} ${years === 1 ? "year" : "years"}`,
      rows: [
        [
          "Projected cash savings",
          formatCurrency(cur.projection.projectedSavings),
          formatCurrency(scn.projection.projectedSavings),
          changeCurrency(
            cur.projection.projectedSavings,
            scn.projection.projectedSavings
          ),
        ],
        [
          "Projected investments",
          formatCurrency(cur.projection.projectedInvestments),
          formatCurrency(scn.projection.projectedInvestments),
          changeCurrency(
            cur.projection.projectedInvestments,
            scn.projection.projectedInvestments
          ),
        ],
        [
          "Projected total",
          formatCurrency(cur.projection.projectedTotal),
          formatCurrency(scn.projection.projectedTotal),
          changeCurrency(
            cur.projection.projectedTotal,
            scn.projection.projectedTotal
          ),
        ],
      ],
    },
  ];
}

function healthGroups(saved, applied, data) {
  const cur = data.current;
  const scn = data.scenario;
  const app = applied.health;

  const categoryText = (m) =>
    m.bmiCategory
      ? labelFor(BMI_CATEGORY_LABELS, m.bmiCategory)
      : m.bmi !== null && !m.bmiCategoryApplicable
        ? "Not applicable under 18"
        : EMPTY_VALUE;

  return [
    {
      title: "Body",
      rows: [
        [
          "Weight",
          `${formatNumber(saved.weightKg)} kg`,
          `${formatNumber(app.weightKg)} kg`,
          changeUnit(saved.weightKg, app.weightKg, "kg"),
        ],
        [
          "BMI",
          formatNumber(cur.bmi),
          formatNumber(scn.bmi),
          changeUnit(cur.bmi, scn.bmi, ""),
        ],
        [
          "BMI category",
          categoryText(cur),
          categoryText(scn),
          changeText(categoryText(cur), categoryText(scn)),
        ],
      ],
    },
    {
      title: "Lifestyle",
      rows: [
        [
          "Activity level",
          labelFor(ACTIVITY_LEVEL_LABELS, cur.activityLevel),
          labelFor(ACTIVITY_LEVEL_LABELS, scn.activityLevel),
          changeText(cur.activityLevel, scn.activityLevel),
        ],
        [
          "Sleep",
          `${formatNumber(cur.sleepHours)} hrs`,
          `${formatNumber(scn.sleepHours)} hrs`,
          changeUnit(cur.sleepHours, scn.sleepHours, "hrs"),
        ],
      ],
    },
  ];
}

function MissingProfileCard({ title, message, to, action }) {
  return (
    <Card padding="md">
      <h3 className={styles.sectionTitle}>{title}</h3>
      <EmptyState
        message={message}
        action={
          <Link to={to} className={styles.plainLink}>
            <Button size="sm">{action}</Button>
          </Link>
        }
      />
    </Card>
  );
}

/**
 * What-If Simulator.
 *
 * Saved profiles are fetched once to give the inputs their starting
 * values and are never written back: this page only ever calls the two
 * GET profile endpoints and the stateless POST /simulate calculation.
 * Scenario values live in component state alone, so leaving the page or
 * pressing Reset discards them. All formulas run on the server in the
 * Phase 8 calculation service; nothing is calculated here except
 * differences for display.
 */
function SimulatorPage() {
  // saved === null while loading; otherwise { health, wealth } (each may
  // be null when that profile hasn't been created yet).
  const [saved, setSaved] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [values, setValues] = useState(() => initialScenario(null, null));
  const [result, setResult] = useState(null); // { data, applied }
  const [simError, setSimError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Load the saved profiles and seed the scenario from them.
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchHealthProfile(), fetchWealthProfile()])
      .then(([health, wealth]) => {
        if (cancelled) return;
        const profiles = {
          health: health.profile || null,
          wealth: wealth.profile || null,
        };
        setLoadError("");
        setSaved(profiles);
        setValues(initialScenario(profiles.health, profiles.wealth));
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

  function retry() {
    setLoadError("");
    setSaved(null);
    setAttempt((n) => n + 1);
  }

  const hasWealth = Boolean(saved?.wealth);
  const hasHealth = Boolean(saved?.health);

  const initial = useMemo(
    () => initialScenario(saved?.health, saved?.wealth),
    [saved]
  );
  const { errors, body } = useMemo(
    () =>
      saved
        ? validateScenario(values, { hasWealth, hasHealth })
        : { errors: {}, body: null },
    [saved, values, hasWealth, hasHealth]
  );
  const changed = isScenarioChanged(values, initial);
  // A stable key, so the request only fires when the numbers really change.
  const bodyKey = body ? JSON.stringify(body) : null;

  // 2. Ask the server for current vs what-if whenever the scenario is
  // valid and has settled. Invalid scenarios are never sent; the last
  // good result stays on screen meanwhile.
  useEffect(() => {
    if (!bodyKey || (!hasWealth && !hasHealth)) return undefined;
    let cancelled = false;

    const timer = setTimeout(() => {
      setIsUpdating(true);
      simulateScenario(JSON.parse(bodyKey))
        .then((data) => {
          if (cancelled) return;
          setSimError("");
          setResult({ data, applied: JSON.parse(bodyKey) });
        })
        .catch((error) => {
          if (cancelled) return;
          setSimError(
            error.status === 401
              ? "Your session has expired. Please sign in again."
              : "We couldn't update the comparison. Your saved profile isn't affected. Try changing a value again."
          );
        })
        .finally(() => {
          if (!cancelled) setIsUpdating(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bodyKey, hasWealth, hasHealth]);

  const setField = (field) => (event) => {
    const next = event.target.value;
    setValues((prev) => ({ ...prev, [field]: next }));
  };

  // Restores the scenario to the saved values. Local state only; no
  // request is made and nothing is saved.
  function resetScenario() {
    setValues(initial);
  }

  // ---- states before the simulator is usable ----

  if (loadError) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message={loadError}
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

  if (saved === null) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.note}>Loading your saved information…</p>
        </Card>
      </PageContainer>
    );
  }

  const data = result?.data;
  const applied = result?.applied;
  const showWealth = hasWealth && data?.wealth && applied?.wealth;
  const showHealth = hasHealth && data?.health && applied?.health;
  const waitingFirstResult = (hasWealth || hasHealth) && !result && !simError;
  const hasErrors = Object.keys(errors).length > 0;

  const shortfall =
    showWealth && isNum(data.wealth.scenario.projection.projectedSavings)
      ? data.wealth.scenario.projection.projectedSavings
      : null;

  return (
    <PageContainer>
      <div className={styles.intro}>
        <div>
          <p className={styles.introText}>
            Try changes to your finances and health and compare them with your
            current numbers. This is a what-if only: your saved profiles are
            never changed.
          </p>
        </div>
        {(hasWealth || hasHealth) && (
          <Button
            variant="outline"
            onClick={resetScenario}
            disabled={!changed}
          >
            Reset Scenario
          </Button>
        )}
      </div>

      {simError && (
        <p role="alert" className={styles.notice}>
          {simError}
        </p>
      )}
      {hasErrors && (
        <p role="status" className={styles.notice}>
          Fix the highlighted values to update the comparison.
        </p>
      )}

      {/* ---------------- Financial ---------------- */}
      {hasWealth ? (
        <Card padding="md">
          <h3 className={styles.sectionTitle}>Financial what-if</h3>

          <div className={styles.fields}>
            <FormRow>
              <Input
                id="sim-monthlyIncome"
                label="Monthly income (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.monthlyIncome}
                onChange={setField("monthlyIncome")}
                error={errors.monthlyIncome}
              />
              <Input
                id="sim-monthlyExpenses"
                label="Monthly expenses (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.monthlyExpenses}
                onChange={setField("monthlyExpenses")}
                error={errors.monthlyExpenses}
              />
            </FormRow>
            <FormRow>
              <Input
                id="sim-monthlyInvestment"
                label="Monthly investment (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.monthlyInvestment}
                onChange={setField("monthlyInvestment")}
                error={errors.monthlyInvestment}
                description="Taken out of your monthly surplus."
              />
              <Input
                id="sim-currentSavings"
                label="Current savings (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.currentSavings}
                onChange={setField("currentSavings")}
                error={errors.currentSavings}
              />
            </FormRow>
            <FormRow>
              <Select
                id="sim-years"
                label="Simulation period"
                value={values.years}
                onChange={setField("years")}
                error={errors.years}
              >
                {PERIOD_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y} {y === 1 ? "year" : "years"}
                  </option>
                ))}
              </Select>
            </FormRow>
          </div>

          {showWealth ? (
            <div
              className={styles.results}
              aria-busy={isUpdating}
              aria-live="polite"
            >
              <ComparisonTable
                caption="Current finances compared with your what-if scenario"
                groups={financialGroups(saved.wealth, applied, data.wealth)}
              />
              {shortfall !== null && shortfall < 0 && (
                <p className={styles.warning}>
                  In this scenario your cash savings would fall below zero
                  after {data.wealth.years}{" "}
                  {data.wealth.years === 1 ? "year" : "years"}, a shortfall of{" "}
                  {formatCurrency(Math.abs(shortfall))}.
                </p>
              )}
              <p className={styles.note}>
                The projection assumes no investment returns, interest or
                market changes. Monthly investment is paid out of your monthly
                surplus, so cash savings grow by surplus minus investment and
                the invested amount grows by the investment. Emergency fund
                target is {data.config.emergencyFundMonths} months of
                expenses.
              </p>
            </div>
          ) : (
            waitingFirstResult && (
              <p className={styles.note}>Calculating your comparison…</p>
            )
          )}
        </Card>
      ) : (
        <MissingProfileCard
          title="Financial what-if"
          message="Add your financial details to try changes to income, spending and investing."
          to="/wealth-profile"
          action="Complete Wealth Profile"
        />
      )}

      {/* ---------------- Health ---------------- */}
      {hasHealth ? (
        <Card padding="md">
          <h3 className={styles.sectionTitle}>Health what-if</h3>

          <div className={styles.fields}>
            <FormRow columns={3}>
              <Input
                id="sim-weightKg"
                label="Weight (kg)"
                type="number"
                inputMode="decimal"
                min="20"
                step="any"
                value={values.weightKg}
                onChange={setField("weightKg")}
                error={errors.weightKg}
              />
              <Select
                id="sim-activityLevel"
                label="Activity level"
                value={values.activityLevel}
                onChange={setField("activityLevel")}
                error={errors.activityLevel}
              >
                {Object.entries(ACTIVITY_LEVEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                id="sim-sleepHours"
                label="Sleep (hours per night)"
                type="number"
                inputMode="decimal"
                min="0"
                max="24"
                step="any"
                value={values.sleepHours}
                onChange={setField("sleepHours")}
                error={errors.sleepHours}
              />
            </FormRow>
          </div>

          {showHealth ? (
            <div
              className={styles.results}
              aria-busy={isUpdating}
              aria-live="polite"
            >
              <ComparisonTable
                caption="Current health details compared with your what-if scenario"
                groups={healthGroups(saved.health, applied, data.health)}
              />
              <p className={styles.note}>
                Only BMI is calculated, from weight and your saved height.
                Activity and sleep are shown for comparison: Forevia doesn't
                estimate their effect on your health. BMI is a general
                screening measure, not a diagnosis
                {data.health.current.bmiCategoryApplicable === false
                  ? ", and adult BMI categories don't apply under 18."
                  : "."}
              </p>
            </div>
          ) : (
            waitingFirstResult && (
              <p className={styles.note}>Calculating your comparison…</p>
            )
          )}
        </Card>
      ) : (
        <MissingProfileCard
          title="Health what-if"
          message="Add your health details to see how a change in weight would affect your BMI."
          to="/health-profile"
          action="Complete Health Profile"
        />
      )}

      <p className={styles.disclaimer}>
        Forevia provides educational simulations based on the numbers you
        enter. They are not predictions, and this is not medical or financial
        advice.
      </p>
    </PageContainer>
  );
}

export default SimulatorPage;
