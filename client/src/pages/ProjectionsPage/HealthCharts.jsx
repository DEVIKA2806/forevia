import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import Card from "../../components/ui/Card";
import { chartColors } from "../../components/charts/chartTheme";
import {
  ACTIVITY_LEVEL_LABELS,
  BMI_CATEGORY_LABELS,
  labelFor,
} from "../../constants/profileOptions";
import { formatNumber, EMPTY_VALUE } from "../../utils/formatters";
import { ChartFigure, DetailRows, legendFormatter, tooltipStyle } from "./chartParts";
import overview from "../OverviewPage.module.css";
import styles from "./ProjectionsPage.module.css";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const axisTick = { fill: chartColors.axisText, fontSize: 12 };

// One light-to-dark ramp for increasing BMI. Deliberately not green/red:
// the ranges are descriptive, not "good" and "bad".
const BAND_FILLS = {
  underweight: "#d9d5fa",
  normal: "#b9b2f5",
  overweight: "#9187ee",
  obese: "#6b5fe6",
};

function rangeText(band) {
  if (band.max === null) return `${formatNumber(band.min)} and above`;
  if (band.min === 0) return `below ${formatNumber(band.max)}`;
  return `${formatNumber(band.min)} to under ${formatNumber(band.max)}`;
}

function BmiCard({ health }) {
  const { bmi, bmiCategory, bmiCategoryApplicable, bmiScale } = health;

  if (!isNum(bmi)) {
    return (
      <Card padding="md">
        <h3 className={overview.cardTitle}>BMI</h3>
        <p className={overview.note}>
          BMI can't be calculated from the height and weight in your profile.
        </p>
      </Card>
    );
  }

  if (!bmiCategoryApplicable) {
    return (
      <Card padding="md">
        <h3 className={overview.cardTitle}>BMI</h3>
        <p className={styles.bigValue}>{formatNumber(bmi)}</p>
        <p className={overview.note}>
          Adult BMI ranges don't apply under 18, so no range is shown. Ask a
          doctor how to read BMI for your age.
        </p>
      </Card>
    );
  }

  // Bars are stacked from 0, so positions are shifted by `lo` and the axis
  // labels shift them back.
  const lo = Math.min(10, Math.floor(bmi) - 1);
  const hi = Math.max(40, Math.ceil(bmi) + 2);
  const bands = bmiScale.map((b) => {
    const from = Math.max(b.min, lo);
    const to = b.max === null ? hi : Math.min(b.max, hi);
    return { ...b, width: Math.max(0, to - from) };
  });
  const row = { name: "BMI" };
  for (const b of bands) row[b.key] = b.width;
  const boundaries = bmiScale.filter((b) => b.min > lo).map((b) => b.min);
  const ticks = [0, ...boundaries.map((v) => v - lo), hi - lo];
  const current = bands.find((b) => b.key === bmiCategory);

  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>BMI</h3>
      <p className={styles.bigValue}>
        {formatNumber(bmi)}
        {bmiCategory && (
          <span className={styles.bigValueNote}>
            {" "}
            {labelFor(BMI_CATEGORY_LABELS, bmiCategory)}
          </span>
        )}
      </p>
      <ChartFigure
        title="Where your BMI sits on the standard adult ranges"
        description={`Your BMI is ${formatNumber(bmi)}.`}
        height={150}
      >
        <BarChart layout="vertical" data={[row]} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={chartColors.grid} />
          <XAxis
            type="number"
            domain={[0, hi - lo]}
            ticks={ticks}
            tickFormatter={(v) => formatNumber(Number((v + lo).toFixed(1)))}
            tick={axisTick}
          />
          <YAxis type="category" dataKey="name" hide />
          <Legend itemSorter={null} formatter={legendFormatter} />
          {bands.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={labelFor(BMI_CATEGORY_LABELS, b.key)}
              stackId="bmi"
              fill={BAND_FILLS[b.key]}
              isAnimationActive={false}
            />
          ))}
          <ReferenceLine
            x={bmi - lo}
            stroke={chartColors.primary}
            strokeWidth={3}
            label={{ value: `Your BMI ${formatNumber(bmi)}`, position: "top", fill: chartColors.primary, fontSize: 12 }}
          />
        </BarChart>
      </ChartFigure>
      <div className={styles.rowsGap}>
        <DetailRows
          rows={[
            ["Your BMI", formatNumber(bmi)],
            ...(current ? [["Range", `${labelFor(BMI_CATEGORY_LABELS, current.key)} (${rangeText(current)})`]] : []),
          ]}
        />
      </div>
      <p className={`${overview.note} ${styles.rowsGap}`}>
        BMI is a general screening measure from height and weight. It doesn't
        account for muscle, age or body composition, and it is not a diagnosis.
      </p>
    </Card>
  );
}

function SleepCard({ health }) {
  const hours = health.sleepHours;
  if (!isNum(hours)) {
    return (
      <Card padding="md">
        <h3 className={overview.cardTitle}>Sleep</h3>
        <p className={overview.note}>No sleep duration saved in your health profile.</p>
      </Card>
    );
  }
  const max = Math.max(12, Math.ceil(hours));
  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>Sleep</h3>
      <p className={styles.bigValue}>
        {formatNumber(hours)} hrs<span className={styles.bigValueNote}> per night, as you reported</span>
      </p>
      <ChartFigure
        title="Reported sleep"
        description={`You reported ${formatNumber(hours)} hours of sleep per night.`}
        height={110}
      >
        <BarChart layout="vertical" data={[{ name: "Sleep", hours }]} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={chartColors.grid} />
          <XAxis type="number" domain={[0, max]} tickFormatter={(v) => `${v}h`} tick={axisTick} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(v) => `${formatNumber(v)} hrs`} contentStyle={tooltipStyle} />
          <Bar dataKey="hours" name="Hours per night" fill={chartColors.primary} maxBarSize={36} />
        </BarChart>
      </ChartFigure>
      <p className={`${overview.note} ${styles.rowsGap}`}>
        Shown as you entered it. Forevia doesn't judge this number: sleep needs
        vary with age and the individual.
      </p>
    </Card>
  );
}

function ActivityCard({ health }) {
  const selected = health.activityLevel;
  return (
    <Card padding="md">
      <h3 className={overview.cardTitle}>Physical activity</h3>
      {selected ? (
        <>
          <p className={styles.bigValue}>
            {labelFor(ACTIVITY_LEVEL_LABELS, selected)}
            <span className={styles.bigValueNote}> as you reported</span>
          </p>
          <ol className={styles.steps} aria-label="Activity levels">
            {health.activityLevels.map((level) => {
              const active = level === selected;
              return (
                <li
                  key={level}
                  className={[styles.step, active ? styles.stepActive : ""].join(" ")}
                  aria-current={active ? "true" : undefined}
                >
                  {labelFor(ACTIVITY_LEVEL_LABELS, level)}
                  {active && <span className={styles.stepTag}> (yours)</span>}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className={overview.note}>{EMPTY_VALUE} No activity level saved.</p>
      )}
      <p className={`${overview.note} ${styles.rowsGap}`}>
        Forevia doesn't estimate the health effect of your activity level.
      </p>
    </Card>
  );
}

/** Descriptive charts from the saved health profile only. */
export function HealthCharts({ health }) {
  return (
    <>
      <div className={styles.chartGrid}>
        <BmiCard health={health} />
        <div className={styles.stack}>
          <SleepCard health={health} />
          <ActivityCard health={health} />
        </div>
      </div>
      <p className={overview.disclaimer}>
        Forevia provides educational information. These charts show only what
        you have saved: there are no past measurements, and Forevia does not
        predict health outcomes, disease risk or life expectancy. They are not
        a diagnosis or medical advice. Speak to a doctor about your health.
      </p>
    </>
  );
}
