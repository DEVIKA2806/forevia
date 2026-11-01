import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import { chartColors } from "../../components/charts/chartTheme";
import { formatCurrency, formatPercent } from "../../utils/formatters";
import { formatCompactCurrency } from "./chartHelpers";
import {
  ColoredBar,
  ChartFigure,
  DetailRows,
  legendFormatter,
  tooltipStyle,
} from "./chartParts";
import overview from "../OverviewPage.module.css";
import styles from "./ProjectionsPage.module.css";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);


/** Income vs expenses, and where the surplus goes. Current snapshot only. */
export function CashFlowCharts({ snapshot }) {
  const { monthlyIncome, monthlyExpenses, monthlyInvestment } = snapshot;
  const surplus = snapshot.monthlySurplus;
  const cashChange = snapshot.monthlyCashChange;
  const isDeficit = isNum(surplus) && surplus < 0;

  const incomeData = [
    { name: "Income", amount: monthlyIncome, fill: chartColors.primary },
    { name: "Expenses", amount: monthlyExpenses, fill: chartColors.warning },
  ];
  const surplusData = [
    {
      name: isDeficit ? "Deficit" : "Surplus",
      amount: surplus,
      fill: isDeficit ? chartColors.danger : chartColors.success,
    },
    { name: "Invested", amount: monthlyInvestment, fill: chartColors.primary },
    {
      name: "Cash change",
      amount: cashChange,
      fill: isNum(cashChange) && cashChange < 0 ? chartColors.danger : chartColors.success,
    },
  ];

  return (
    <div className={styles.chartGrid}>
      <Card padding="md">
        <h3 className={overview.cardTitle}>Monthly income vs expenses</h3>
        <ChartFigure
          title="Current monthly figures"
          description={`Income ${formatCurrency(monthlyIncome)}, expenses ${formatCurrency(monthlyExpenses)}.`}
          height={240}
        >
          <BarChart data={incomeData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="name" tick={{ fill: chartColors.axisText, fontSize: 12 }} />
            <YAxis
              width={64}
              tickFormatter={formatCompactCurrency}
              tick={{ fill: chartColors.axisText, fontSize: 12 }}
            />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="amount" name="Per month" shape={ColoredBar} maxBarSize={80}>
              <LabelList
                dataKey="amount"
                position="top"
                fontSize={12}
                fill={chartColors.axisText}
                formatter={(v) => formatCurrency(v)}
              />
            </Bar>
          </BarChart>
        </ChartFigure>
        <DetailRows
          rows={[
            ["Monthly income", formatCurrency(monthlyIncome)],
            ["Monthly expenses", formatCurrency(monthlyExpenses)],
          ]}
        />
        <p className={`${overview.note} ${overview.gapText}`}>
          A snapshot of your saved profile. Forevia doesn't store past months,
          so there is no historical trend to show.
        </p>
      </Card>

      <Card padding="md">
        <h3 className={overview.cardTitle}>
          Monthly {isDeficit ? "deficit" : "surplus"} and where it goes
        </h3>
        <ChartFigure
          title="Surplus, investment and change in cash"
          description={`${isDeficit ? "Deficit" : "Surplus"} ${formatCurrency(surplus)}, invested ${formatCurrency(monthlyInvestment)}, change in cash savings ${formatCurrency(cashChange)} per month.`}
          height={240}
        >
          <BarChart data={surplusData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="name" tick={{ fill: chartColors.axisText, fontSize: 12 }} />
            <YAxis
              width={64}
              tickFormatter={formatCompactCurrency}
              tick={{ fill: chartColors.axisText, fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke={chartColors.axisText} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="amount" name="Per month" shape={ColoredBar} maxBarSize={80}>
              <LabelList
                dataKey="amount"
                position="top"
                fontSize={12}
                fill={chartColors.axisText}
                formatter={(v) => formatCurrency(v)}
              />
            </Bar>
          </BarChart>
        </ChartFigure>
        <DetailRows
          rows={[
            [isDeficit ? "Monthly deficit" : "Monthly surplus", formatCurrency(surplus)],
            ["Invested (paid from surplus)", formatCurrency(monthlyInvestment)],
            ["Change in cash savings", formatCurrency(cashChange)],
          ]}
        />
        <p className={`${overview.note} ${overview.gapText}`}>
          Monthly investment is taken out of your surplus, so the change in
          cash savings is surplus minus investment.
          {isDeficit && " Your expenses are higher than your income."}
        </p>
      </Card>
    </div>
  );
}

/** Savings rate, expense ratio and investment rate from the Phase 8 engine. */
export function IndicatorCards({ snapshot }) {
  const needsIncome = "needs monthly income";
  return (
    <div className={overview.statGrid}>
      <StatCard
        label="Savings rate"
        value={formatPercent(snapshot.savingsRate)}
        supportingText={snapshot.savingsRate === null ? needsIncome : "of income left after expenses"}
      />
      <StatCard
        label="Expense ratio"
        value={formatPercent(snapshot.expenseRatio)}
        supportingText={snapshot.expenseRatio === null ? needsIncome : "of income spent"}
      />
      <StatCard
        label="Investment rate"
        value={formatPercent(snapshot.investmentRate)}
        supportingText={snapshot.investmentRate === null ? needsIncome : "of income invested"}
      />
    </div>
  );
}

/** Current savings against the emergency-fund target, with the gap. */
export function EmergencyFundOverview({ emergency }) {
  const { target, current, gap, targetMonths } = emergency;
  const hasTarget = isNum(target) && target > 0 && isNum(current) && isNum(gap);

  if (!hasTarget) {
    return (
      <Card padding="md">
        <h3 className={overview.cardTitle}>Emergency fund</h3>
        <p className={overview.note}>
          {emergency.status === "no_target"
            ? "Your monthly expenses are ₹0, so there is no emergency-fund target yet."
            : "Add your monthly income, expenses and savings in your wealth profile to see your emergency fund."}
        </p>
      </Card>
    );
  }

  const saved = Math.max(0, Math.min(current, target));
  const above = Math.max(0, current - target);
  const data = [{ name: "Emergency fund", saved, gap }];

  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>Emergency fund</h3>
      <p className={overview.note}>
        Target: {targetMonths} months of expenses. Your current savings are
        treated as your emergency fund, the same as on the Wealth page.
      </p>
      <ChartFigure
        title="Progress toward the target"
        description={`Saved ${formatCurrency(current)} of a ${formatCurrency(target)} target. Remaining gap ${formatCurrency(gap)}.`}
        height={150}
      >
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={chartColors.grid} />
          <XAxis
            type="number"
            domain={[0, target]}
            tickFormatter={formatCompactCurrency}
            tick={{ fill: chartColors.axisText, fontSize: 12 }}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
          <Legend formatter={legendFormatter} />
          <Bar dataKey="saved" name="Saved toward target" stackId="fund" fill={chartColors.success} />
          <Bar dataKey="gap" name="Remaining gap" stackId="fund" fill={chartColors.warning} />
        </BarChart>
      </ChartFigure>
      <div className={styles.rowsGap}>
        <DetailRows
          rows={[
            ["Current savings", formatCurrency(current)],
            [`Target (${targetMonths} months)`, formatCurrency(target)],
            ["Remaining gap", formatCurrency(gap)],
            ...(above > 0 ? [["Above target", formatCurrency(above)]] : []),
          ]}
        />
      </div>
    </Card>
  );
}
