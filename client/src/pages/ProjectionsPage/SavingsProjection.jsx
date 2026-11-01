import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import FormRow from "../../components/ui/FormRow";
import { chartColors } from "../../components/charts/chartTheme";
import { formatCurrency, formatNumber } from "../../utils/formatters";
import {
  PERIOD_OPTIONS,
  RETURN_OPTIONS,
  formatCompactCurrency,
  formatMonthLabel,
  formatMonthTick,
  formatMonths,
  monthTicks,
  yearsText,
} from "./chartHelpers";
import { ChartFigure, DetailRows, legendFormatter, tooltipStyle } from "./chartParts";
import overview from "../OverviewPage.module.css";
import styles from "./ProjectionsPage.module.css";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const axisTick = { fill: chartColors.axisText, fontSize: 12 };

/** Period and optional illustrative-return selectors. */
export function ProjectionControls({ years, annualReturn, onYears, onReturn }) {
  return (
    <FormRow>
      <Select
        id="proj-years"
        label="Projection period"
        value={years}
        onChange={(e) => onYears(Number(e.target.value))}
      >
        {PERIOD_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {yearsText(y)}
          </option>
        ))}
      </Select>
      <Select
        id="proj-return"
        label="Illustrative investment return"
        description="Optional. Off by default. An example to explore, not a forecast."
        value={annualReturn}
        onChange={(e) => onReturn(Number(e.target.value))}
      >
        {RETURN_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r === 0 ? "None (no returns assumed)" : `${r}% a year (illustrative)`}
          </option>
        ))}
      </Select>
    </FormRow>
  );
}

function MissingDetails({ children }) {
  return (
    <Card padding="md">
      <p className={overview.note}>{children}</p>
      <div className={styles.rowsGap}>
        <Link to="/wealth-profile" className={overview.editLink}>
          <Button size="sm">Review Wealth Profile</Button>
        </Link>
      </div>
    </Card>
  );
}

/** Cash savings and investments over time, with assumptions and formula. */
export function SavingsProjection({ snapshot, projection, assumptions }) {
  if (!projection || projection.series.length === 0) {
    return (
      <MissingDetails>
        We can't build a projection because some of your financial details
        are missing or invalid. Check your wealth profile and try again.
      </MissingDetails>
    );
  }

  const { series, end, breakdown, months, years } = projection;
  const change = projection.monthlyCashChange;
  const rate = assumptions.annualReturnPercent;
  const modelled = assumptions.returnsModelled;
  const anyNegative = series.some((p) => p.cashSavings < 0);
  const surplus = snapshot.monthlySurplus;

  const rows = [
    ["Cash savings", formatCurrency(end.cashSavings)],
    ["Investments", formatCurrency(end.investments)],
    ["Total", formatCurrency(end.total)],
  ];
  const buildRows = [
    ["Starting cash savings", formatCurrency(breakdown.startingCash)],
    [
      `Cash added over ${yearsText(years)} (${formatCurrency(change)} a month)`,
      formatCurrency(breakdown.cashAdded),
    ],
    ["Starting investments", formatCurrency(breakdown.startingInvestments)],
    [
      `Investment contributions (${formatCurrency(projection.monthlyInvestment)} a month)`,
      formatCurrency(breakdown.investmentContributions),
    ],
    ...(modelled
      ? [["Illustrative growth on investments", formatCurrency(breakdown.illustrativeGrowth)]]
      : []),
  ];

  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>
        Projected cash savings and investments over {yearsText(years)}
      </h3>
      <p className={styles.badgeLine}>
        {modelled
          ? `Illustrative projection: investments grow ${formatNumber(rate)}% a year. Not a forecast.`
          : "Projection from your saved figures: no investment returns assumed."}
      </p>

      <ChartFigure
        title="Projection"
        description={`After ${yearsText(years)}: cash savings ${formatCurrency(end.cashSavings)}, investments ${formatCurrency(end.investments)}, total ${formatCurrency(end.total)}.`}
        height={300}
      >
        <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, months]}
            ticks={monthTicks(months)}
            tickFormatter={formatMonthTick}
            tick={axisTick}
          />
          <YAxis width={64} tickFormatter={formatCompactCurrency} tick={axisTick} />
          {anyNegative && <ReferenceLine y={0} stroke={chartColors.danger} />}
          <Tooltip
            labelFormatter={formatMonthLabel}
            formatter={(v) => formatCurrency(v)}
            contentStyle={tooltipStyle}
          />
          <Legend formatter={legendFormatter} />
          <Line type="monotone" dataKey="cashSavings" name="Cash savings" stroke={chartColors.primary} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="investments" name="Investments" stroke={chartColors.success} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="total" name="Total" stroke={chartColors.axisText} strokeWidth={2} strokeDasharray="6 4" dot={false} />
        </LineChart>
      </ChartFigure>

      {change < 0 && projection.cashDepletionMonth !== null && (
        <p role="status" className={styles.warning}>
          With these figures your cash savings would fall below zero in month{" "}
          {projection.cashDepletionMonth} ({formatMonths(projection.cashDepletionMonth)}),
          and reach {formatCurrency(end.cashSavings)} after {yearsText(years)}. A
          negative amount means a shortfall, not money you have.
        </p>
      )}
      {change === 0 && (
        <p className={overview.note}>
          Your income minus expenses minus investment is ₹0 a month, so cash
          savings stay flat.
        </p>
      )}

      <div className={styles.rowsGap}>
        <h4 className={styles.subTitle}>After {yearsText(years)}</h4>
        <DetailRows rows={rows} />
      </div>
      <div className={styles.rowsGap}>
        <h4 className={styles.subTitle}>How that total is built</h4>
        <DetailRows rows={buildRows} />
      </div>

      <div className={styles.assumptions}>
        <h4 className={styles.subTitle}>Assumptions and formula</h4>
        <ul className={styles.assumptionList}>
          <li>
            Starts from your saved profile: cash savings{" "}
            {formatCurrency(snapshot.currentSavings)} and investments{" "}
            {formatCurrency(snapshot.currentInvestments)}.
          </li>
          <li>
            Monthly surplus = income − expenses = {formatCurrency(surplus)}.
            Your monthly investment of {formatCurrency(snapshot.monthlyInvestment)}{" "}
            is paid out of that surplus, not on top of it, so no money is
            counted twice.
          </li>
          <li>
            Income, expenses and investment stay the same every month. Cash
            earns no interest. Inflation, taxes and fees are not modelled.
          </li>
          <li>
            {modelled
              ? `Illustrative only: investments are assumed to grow ${formatNumber(rate)}% a year (${formatNumber(rate / 12, 2)}% a month, compounded monthly), with contributions added at the end of each month. Real returns vary and can be negative.`
              : "No investment returns are assumed: investments only grow by the amounts you contribute."}
          </li>
        </ul>
        <p className={styles.formulaLabel}>Each month (m = number of months):</p>
        <code className={styles.formula}>
          cash(m) = current savings + (surplus − investment) × m
        </code>
        <code className={styles.formula}>
          {modelled
            ? "investments(m) = current investments × (1 + r/12)^m + investment × ((1 + r/12)^m − 1) ÷ (r/12),  r = " + formatNumber(rate) + "% a year"
            : "investments(m) = current investments + investment × m"}
        </code>
        <p className={overview.note}>
          This is a projection of the numbers you entered, not a prediction of
          your actual future wealth, and not financial advice.
        </p>
      </div>
    </Card>
  );
}

/** Progress of cash savings toward the emergency-fund target. */
export function EmergencyFundProjection({ emergency, projection, assumptions }) {
  const { status, target, current, gap, monthlyContribution, monthsToTarget, targetMonths } = emergency;
  const years = assumptions.years;

  if (status === "missing_data") {
    return (
      <MissingDetails>
        We can't project your emergency fund yet. It needs your monthly
        income, monthly expenses, monthly investment and current savings
        from your wealth profile, and some of these are missing.
      </MissingDetails>
    );
  }

  const monthsLine = {
    no_target:
      "Your monthly expenses are ₹0, so the emergency-fund target is ₹0 and there is nothing to build toward. Update your monthly expenses in your wealth profile.",
    reached: `Your current savings already cover the ${targetMonths}-month target.`,
    reachable: `At ${formatCurrency(monthlyContribution)} a month added to your cash savings, the gap of ${formatCurrency(gap)} would close in about ${formatMonths(monthsToTarget)}, if your income, expenses and investing stay the same.`,
    too_far: `At ${formatCurrency(monthlyContribution)} a month it would take more than 50 years to close the gap of ${formatCurrency(gap)}.`,
    not_reachable: `Nothing is being added to your cash savings each month (income − expenses − investment = ${formatCurrency(monthlyContribution)}), so under these figures the gap of ${formatCurrency(gap)} does not close.`,
  }[status];

  const showChart = isNum(target) && target > 0 && projection && projection.series.length > 0;
  const beyond =
    status === "reachable" && monthsToTarget > years * 12
      ? ` That is beyond the ${yearsText(years)} shown in the chart.`
      : "";

  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>Emergency fund over {yearsText(years)}</h3>
      <p role="status">{monthsLine}{beyond}</p>
      <p className={`${overview.note} ${styles.rowsGap}`}>
        Your current savings are treated as your emergency fund, and the
        balance changes each month by surplus minus investment. Nothing is
        assumed about savings you haven't entered.
      </p>

      {showChart && (
        <ChartFigure
          title="Cash savings against the target"
          description={`Target ${formatCurrency(target)}. Current savings ${formatCurrency(current)}.`}
          height={260}
        >
          <LineChart data={projection.series} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, projection.months]}
              ticks={monthTicks(projection.months)}
              tickFormatter={formatMonthTick}
              tick={axisTick}
            />
            <YAxis
              width={64}
              domain={[(min) => Math.min(0, min), (max) => Math.max(max, target)]}
              tickFormatter={formatCompactCurrency}
              tick={axisTick}
            />
            <ReferenceLine
              y={target}
              stroke={chartColors.warning}
              strokeDasharray="6 4"
              label={{ value: "Target", position: "insideTopLeft", fill: chartColors.warning, fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={formatMonthLabel}
              formatter={(v) => formatCurrency(v)}
              contentStyle={tooltipStyle}
            />
            <Legend formatter={legendFormatter} />
            <Line type="monotone" dataKey="cashSavings" name="Cash savings (emergency fund)" stroke={chartColors.primary} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartFigure>
      )}

      <div className={styles.rowsGap}>
        <DetailRows
          rows={[
            [`Target (${targetMonths} months of expenses)`, formatCurrency(target)],
            ["Current savings", formatCurrency(current)],
            ["Remaining gap", formatCurrency(gap)],
            ["Added to cash each month", formatCurrency(monthlyContribution)],
            [
              "Estimated time to target",
              status === "reached"
                ? "Already reached"
                : status === "reachable"
                  ? formatMonths(monthsToTarget)
                  : status === "too_far"
                    ? "More than 50 years"
                    : "Not reachable at current figures",
            ],
          ]}
        />
      </div>
      <p className={`${overview.note} ${styles.rowsGap}`}>
        Estimate = gap ÷ monthly addition, rounded up to whole months. It is a
        projection of your saved figures, not a prediction.
      </p>
    </Card>
  );
}
