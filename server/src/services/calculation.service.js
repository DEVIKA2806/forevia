/**
 * Deterministic calculation engine (Phase 8).
 *
 * Pure functions only: no database access, no Express, no randomness, no
 * AI. Each function takes plain profile objects and returns plain numbers
 * or null. That keeps the maths easy to test and means the controller is
 * the only place that knows about Prisma or HTTP.
 *
 * Rule used throughout: if a metric can't be calculated meaningfully
 * (missing input, division by zero, non-finite result) it is returned as
 * null, never NaN or Infinity, so the JSON response is always safe.
 */

// Configurable defaults. Change here (or pass an override in `options`)
// rather than hardcoding the number anywhere else.
const DEFAULT_EMERGENCY_FUND_MONTHS = 3;

// What-if simulator (Phase 9): projection length used when none is given,
// and the longest period the API will accept.
const DEFAULT_PROJECTION_YEARS = 5;
const MAX_PROJECTION_YEARS = 50;

// Surplus smaller than this (in currency units) counts as "balanced".
// Half a paisa/cent, i.e. effectively exactly zero after rounding to two
// decimals, so floating-point noise can't flip the status.
const BALANCED_TOLERANCE = 0.005;

// Adult BMI categories (WHO ranges). Descriptive only.
const BMI_CATEGORIES = [
  { max: 18.5, key: "underweight" },
  { max: 25, key: "normal" },
  { max: 30, key: "overweight" },
  { max: Infinity, key: "obese" },
];
const ADULT_AGE = 18;

// ---------- helpers ----------

/** Returns a finite number, or null for anything else (incl. "", NaN). */
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return null;
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, decimals) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  // Avoid returning -0 in JSON.
  return Number.isFinite(rounded) ? rounded + 0 : null;
}

const roundMoney = (v) => round(v, 2);
const roundPercent = (v) => round(v, 1);

/** a / b * 100, or null when b isn't a positive number. */
function percentOf(part, whole) {
  if (part === null || whole === null || whole <= 0) return null;
  const result = (part / whole) * 100;
  return Number.isFinite(result) ? result : null;
}

// ---------- health ----------

function categorizeBmi(bmi, age) {
  if (bmi === null) return null;
  // Adult ranges are not meaningful for under-18s (they use age/sex
  // percentiles), so no category is given rather than a wrong one.
  if (age === null || age < ADULT_AGE) return null;
  return BMI_CATEGORIES.find((c) => bmi < c.max).key;
}

/**
 * @param {object|null} profile HealthProfile record
 * @returns {object|null} null when there is no profile
 */
function calculateHealthMetrics(profile) {
  if (!profile) return null;

  const age = toNumber(profile.age);
  const heightCm = toNumber(profile.heightCm);
  const weightKg = toNumber(profile.weightKg);

  let bmi = null;
  if (heightCm !== null && weightKg !== null && heightCm > 0 && weightKg > 0) {
    const heightM = heightCm / 100;
    bmi = round(weightKg / (heightM * heightM), 1);
  }

  return {
    bmi,
    bmiCategory: categorizeBmi(bmi, age),
    // Lets the UI explain why there's no category for a young user.
    bmiCategoryApplicable: age !== null && age >= ADULT_AGE,
    age,
    activityLevel: profile.activityLevel ?? null,
    sleepHours: toNumber(profile.sleepHours),
    smokingStatus: profile.smokingStatus ?? null,
    alcoholUse: profile.alcoholUse ?? null,
  };
}

// ---------- wealth ----------

function determineFinancialStatus(income, expenses) {
  if (income === null || expenses === null) return "insufficient_data";
  // Nothing entered on either side: there is no cash flow to describe.
  if (income === 0 && expenses === 0) return "insufficient_data";

  const surplus = income - expenses;
  if (Math.abs(surplus) < BALANCED_TOLERANCE) return "balanced";
  return surplus > 0 ? "positive_cash_flow" : "negative_cash_flow";
}

/**
 * @param {object|null} profile WealthProfile record
 * @param {{ emergencyFundMonths?: number }} [options]
 * @returns {object|null} null when there is no profile
 *
 * Note: existingDebt is a total outstanding balance. There is no monthly
 * repayment field, so no debt-to-income ratio is calculated.
 */
function calculateWealthMetrics(profile, options = {}) {
  if (!profile) return null;

  const months =
    toNumber(options.emergencyFundMonths) > 0
      ? toNumber(options.emergencyFundMonths)
      : DEFAULT_EMERGENCY_FUND_MONTHS;

  const income = toNumber(profile.monthlyIncome);
  const expenses = toNumber(profile.monthlyExpenses);
  const savings = toNumber(profile.currentSavings);
  const monthlyInvestment = toNumber(profile.monthlyInvestment);

  const surplus =
    income !== null && expenses !== null ? income - expenses : null;

  const emergencyFundTarget = expenses !== null ? expenses * months : null;

  const emergencyFundCoverage =
    savings !== null ? percentOf(savings, emergencyFundTarget) : null;

  const emergencyFundGap =
    emergencyFundTarget !== null && savings !== null
      ? Math.max(0, emergencyFundTarget - savings)
      : null;

  return {
    monthlySurplus: roundMoney(surplus),
    savingsRate: roundPercent(percentOf(surplus, income)),
    expenseRatio: roundPercent(percentOf(expenses, income)),
    emergencyFundMonths: months,
    emergencyFundTarget: roundMoney(emergencyFundTarget),
    emergencyFundCoverage: roundPercent(emergencyFundCoverage),
    emergencyFundGap: roundMoney(emergencyFundGap),
    investmentRate: roundPercent(percentOf(monthlyInvestment, income)),
    financialStatus: determineFinancialStatus(income, expenses),
  };
}

/**
 * Combines both. Either side is null when that profile doesn't exist yet.
 */
function calculateSummary({ healthProfile, wealthProfile }, options = {}) {
  const wealth = calculateWealthMetrics(wealthProfile, options);
  return {
    health: calculateHealthMetrics(healthProfile),
    wealth,
    config: {
      emergencyFundMonths:
        wealth?.emergencyFundMonths ??
        (toNumber(options.emergencyFundMonths) > 0
          ? toNumber(options.emergencyFundMonths)
          : DEFAULT_EMERGENCY_FUND_MONTHS),
    },
  };
}

// ---------- projection and what-if scenarios (Phase 9) ----------

/**
 * Simple deterministic projection. No returns, interest or growth are
 * assumed: it only adds up what the scenario's monthly figures say.
 *
 * Interpretation (kept consistent everywhere): monthly investment is paid
 * OUT OF the monthly surplus (income - expenses), not on top of it.
 *   - cash savings change each month by (surplus - monthlyInvestment)
 *   - the invested balance grows each month by monthlyInvestment
 * so the same money is never counted in both places. If investment is
 * larger than the surplus, cash savings fall, and can end up negative
 * (reported as a negative number, i.e. a shortfall, not hidden).
 *
 * @param {object|null} profile WealthProfile-shaped object (saved or scenario)
 * @param {number} years whole years
 */
function calculateProjection(profile, years) {
  const empty = {
    years: null,
    months: null,
    monthlyCashChange: null,
    projectedSavings: null,
    projectedInvestments: null,
    projectedTotal: null,
  };
  if (!profile) return empty;

  const y = toNumber(years);
  if (y === null || !Number.isInteger(y) || y < 1 || y > MAX_PROJECTION_YEARS) {
    return empty;
  }
  const months = y * 12;

  const income = toNumber(profile.monthlyIncome);
  const expenses = toNumber(profile.monthlyExpenses);
  const investment = toNumber(profile.monthlyInvestment);
  const savings = toNumber(profile.currentSavings);
  const investments = toNumber(profile.currentInvestments);

  const surplus =
    income !== null && expenses !== null ? income - expenses : null;
  const monthlyCashChange =
    surplus !== null && investment !== null ? surplus - investment : null;

  const projectedSavings =
    savings !== null && monthlyCashChange !== null
      ? savings + monthlyCashChange * months
      : null;
  const projectedInvestments =
    investments !== null && investment !== null
      ? investments + investment * months
      : null;
  const projectedTotal =
    projectedSavings !== null && projectedInvestments !== null
      ? projectedSavings + projectedInvestments
      : null;

  return {
    years: y,
    months,
    monthlyCashChange: roundMoney(monthlyCashChange),
    projectedSavings: roundMoney(projectedSavings),
    projectedInvestments: roundMoney(projectedInvestments),
    projectedTotal: roundMoney(projectedTotal),
  };
}

// Only these fields can be changed by a scenario. Anything else in a
// scenario object (including ids) is ignored.
const WEALTH_SCENARIO_FIELDS = [
  "monthlyIncome",
  "monthlyExpenses",
  "monthlyInvestment",
  "currentSavings",
];
const HEALTH_SCENARIO_NUMBER_FIELDS = ["weightKg", "sleepHours"];

/**
 * Builds a NEW object: saved values with scenario overrides applied. The
 * saved profile object is never modified, and nothing here touches the
 * database. Missing/invalid overrides fall back to the saved value.
 */
function applyScenario(saved, overrides, numberFields, textFields = []) {
  const result = { ...saved };
  for (const field of numberFields) {
    const value = toNumber(overrides?.[field]);
    if (value !== null) result[field] = value;
  }
  for (const field of textFields) {
    const value = overrides?.[field];
    if (typeof value === "string" && value.trim() !== "") {
      result[field] = value.trim();
    }
  }
  return result;
}

/**
 * Current vs what-if, using the same functions as the Phase 8 summary
 * (calculateWealthMetrics / calculateHealthMetrics), so there is one set
 * of formulas.
 *
 * @param {{healthProfile: object|null, wealthProfile: object|null}} saved
 * @param {{wealth?: object, health?: object, years?: number}} [scenario]
 */
function calculateSimulation({ healthProfile, wealthProfile }, scenario = {}, options = {}) {
  const wealthInput = scenario?.wealth;
  const healthInput = scenario?.health;
  const yearsValue = toNumber(scenario?.years ?? wealthInput?.years);
  const years = yearsValue !== null ? yearsValue : DEFAULT_PROJECTION_YEARS;

  let wealth = null;
  if (wealthProfile) {
    const scenarioProfile = applyScenario(
      wealthProfile,
      wealthInput,
      WEALTH_SCENARIO_FIELDS
    );
    wealth = {
      years,
      current: {
        ...calculateWealthMetrics(wealthProfile, options),
        projection: calculateProjection(wealthProfile, years),
      },
      scenario: {
        ...calculateWealthMetrics(scenarioProfile, options),
        projection: calculateProjection(scenarioProfile, years),
      },
    };
  }

  let health = null;
  if (healthProfile) {
    const scenarioProfile = applyScenario(
      healthProfile,
      healthInput,
      HEALTH_SCENARIO_NUMBER_FIELDS,
      ["activityLevel"]
    );
    health = {
      current: calculateHealthMetrics(healthProfile),
      scenario: calculateHealthMetrics(scenarioProfile),
    };
  }

  return {
    wealth,
    health,
    config: {
      emergencyFundMonths:
        wealth?.current.emergencyFundMonths ??
        calculateSummary({ healthProfile: null, wealthProfile: null }, options)
          .config.emergencyFundMonths,
    },
  };
}

// ---------- charts and projections (Phase 11) ----------

// The most an "illustrative return" may be set to. A guard against typos
// and absurd inputs, not a suggestion of what returns are realistic.
const MAX_ILLUSTRATIVE_RETURN_PERCENT = 20;

// Longest emergency-fund wait reported as a number of months. Beyond the
// longest projection period it is reported as "too far", not as a number.
const MAX_MONTHS_TO_TARGET = MAX_PROJECTION_YEARS * 12;

// Display order for the activity scale (the profile stores one of these).
const ACTIVITY_LEVEL_ORDER = ["sedentary", "light", "moderate", "active"];

/** Same WHO bands as BMI_CATEGORIES, as numeric ranges a chart can draw. */
function buildBmiScale() {
  let min = 0;
  return BMI_CATEGORIES.map(({ max, key }) => {
    const band = { key, min, max: Number.isFinite(max) ? max : null };
    min = max;
    return band;
  });
}

/**
 * Month-by-month projection of the user's saved wealth profile, for
 * charts. Same interpretation as calculateProjection (Phase 9):
 *   - monthly investment is paid OUT OF the monthly surplus;
 *   - cash savings change by (surplus - investment) each month;
 *   - the invested balance grows by the investment each month;
 * so no money is counted twice. Cash earns nothing.
 *
 * Returns are NOT assumed. They are applied only to the invested balance,
 * and only when the caller passes annualReturnPercent > 0 as an explicit,
 * illustrative assumption. Contributions are made at the end of each
 * month and growth compounds monthly:
 *   invested(m) = I0 * (1 + i)^m + C * ((1 + i)^m - 1) / i,  i = rate/12
 * (with i = 0 this is simply I0 + C * m).
 *
 * Returns an empty series (never NaN) when the profile is missing, any
 * input is missing/negative, or years/rate are out of range.
 *
 * @param {object|null} profile WealthProfile record
 * @param {number} years whole years, 1..MAX_PROJECTION_YEARS
 * @param {{ annualReturnPercent?: number }} [options]
 */
function calculateProjectionSeries(profile, years, options = {}) {
  const empty = {
    years: null,
    months: null,
    annualReturnPercent: null,
    monthlyCashChange: null,
    monthlyInvestment: null,
    series: [],
    end: null,
    breakdown: null,
    cashDepletionMonth: null,
  };
  if (!profile) return empty;

  const y = toNumber(years);
  if (y === null || !Number.isInteger(y) || y < 1 || y > MAX_PROJECTION_YEARS) {
    return empty;
  }

  // Not provided = no returns. Provided but unusable (text, NaN, Infinity)
  // is rejected rather than silently treated as "no returns".
  const rawRate = options.annualReturnPercent;
  const rateProvided = rawRate !== undefined && rawRate !== null && rawRate !== "";
  const rateInput = toNumber(rawRate);
  if (rateProvided && rateInput === null) return empty;
  const rate = rateInput === null ? 0 : rateInput;
  if (rate < 0 || rate > MAX_ILLUSTRATIVE_RETURN_PERCENT) return empty;

  const income = toNumber(profile.monthlyIncome);
  const expenses = toNumber(profile.monthlyExpenses);
  const investment = toNumber(profile.monthlyInvestment);
  const savings = toNumber(profile.currentSavings);
  const investments = toNumber(profile.currentInvestments);

  const inputs = [income, expenses, investment, savings, investments];
  if (inputs.some((v) => v === null || v < 0)) return empty;

  const months = y * 12;
  const surplus = income - expenses;
  const monthlyCashChange = surplus - investment;
  const monthlyRate = rate / 1200;

  const investedAt = (m) => {
    if (monthlyRate === 0) return investments + investment * m;
    const factor = (1 + monthlyRate) ** m;
    return investments * factor + investment * ((factor - 1) / monthlyRate);
  };

  const series = [];
  for (let m = 0; m <= months; m += 1) {
    const cash = savings + monthlyCashChange * m;
    const invested = investedAt(m);
    series.push({
      month: m,
      cashSavings: roundMoney(cash),
      investments: roundMoney(invested),
      total: roundMoney(cash + invested),
    });
  }

  const last = series[series.length - 1];
  const contributions = investment * months;
  const investedEnd = investedAt(months);

  const depleted = series.find((point) => point.cashSavings < 0);

  return {
    years: y,
    months,
    annualReturnPercent: round(rate, 2),
    monthlyCashChange: roundMoney(monthlyCashChange),
    monthlyInvestment: roundMoney(investment),
    series,
    end: {
      cashSavings: last.cashSavings,
      investments: last.investments,
      total: last.total,
    },
    breakdown: {
      startingCash: roundMoney(savings),
      cashAdded: roundMoney(monthlyCashChange * months),
      startingInvestments: roundMoney(investments),
      investmentContributions: roundMoney(contributions),
      // 0 unless an illustrative return was chosen.
      illustrativeGrowth: roundMoney(investedEnd - investments - contributions),
    },
    cashDepletionMonth: depleted ? depleted.month : null,
  };
}

/**
 * Progress toward the emergency-fund target. Uses calculateWealthMetrics
 * for the target and gap (one set of formulas) and the same reading of
 * "current balance" as the Phase 8 coverage figure: currentSavings, as
 * entered. Nothing is assumed about money the user hasn't entered.
 *
 * The balance changes each month by (surplus - monthly investment), the
 * same cash change the savings projection uses.
 *
 * status:
 *   missing_data  - no profile, or income/expenses/investment unavailable
 *   no_target     - monthly expenses are 0, so the target is 0
 *   reached       - current savings already cover the target
 *   reachable     - monthsToTarget is a number of months
 *   too_far       - reachable only after more than the longest period
 *   not_reachable - monthly cash change is zero or negative
 */
function calculateEmergencyFundProjection(profile, options = {}) {
  const result = {
    status: "missing_data",
    targetMonths: null,
    target: null,
    current: null,
    gap: null,
    coverage: null,
    monthlyContribution: null,
    monthsToTarget: null,
  };
  const wealth = calculateWealthMetrics(profile, options);
  if (!wealth) return result;

  result.targetMonths = wealth.emergencyFundMonths;
  result.target = wealth.emergencyFundTarget;
  result.current = roundMoney(toNumber(profile.currentSavings));
  result.gap = wealth.emergencyFundGap;
  result.coverage = wealth.emergencyFundCoverage;

  const investment = toNumber(profile.monthlyInvestment);
  const surplus = wealth.monthlySurplus;
  if (
    result.target === null ||
    result.current === null ||
    result.gap === null ||
    surplus === null ||
    investment === null
  ) {
    return result;
  }

  const contribution = roundMoney(surplus - investment);
  result.monthlyContribution = contribution;

  if (result.target <= 0) {
    result.status = "no_target";
  } else if (result.gap <= 0) {
    result.status = "reached";
    result.monthsToTarget = 0;
  } else if (contribution <= 0) {
    result.status = "not_reachable";
  } else {
    // toFixed guards against 3.0000000001 turning into 4 months.
    const months = Math.ceil(Number((result.gap / contribution).toFixed(9)));
    if (months > MAX_MONTHS_TO_TARGET) {
      result.status = "too_far";
    } else {
      result.status = "reachable";
      result.monthsToTarget = months;
    }
  }
  return result;
}

/**
 * Descriptive health indicators for charts: the Phase 8 metrics plus the
 * BMI bands and activity order the chart needs. No scores, no risk, no
 * forecasts.
 */
function calculateHealthChartData(profile) {
  const metrics = calculateHealthMetrics(profile);
  if (!metrics) return null;
  return {
    ...metrics,
    bmiScale: buildBmiScale(),
    activityLevels: [...ACTIVITY_LEVEL_ORDER],
  };
}

/**
 * Everything the Charts & Projections page needs, in one response.
 * Either side is null when that profile doesn't exist yet. Pure: the
 * controller supplies the profiles.
 *
 * @param {{healthProfile: object|null, wealthProfile: object|null}} saved
 * @param {{ years?: number, annualReturnPercent?: number }} [request]
 */
function calculateProjectionsOverview({ healthProfile, wealthProfile }, request = {}, options = {}) {
  const yearsValue = toNumber(request.years);
  const years = yearsValue !== null ? yearsValue : DEFAULT_PROJECTION_YEARS;
  const rateValue = toNumber(request.annualReturnPercent);
  const annualReturnPercent = rateValue !== null ? rateValue : 0;

  let wealth = null;
  if (wealthProfile) {
    const metrics = calculateWealthMetrics(wealthProfile, options);
    const investment = toNumber(wealthProfile.monthlyInvestment);
    const surplus = metrics.monthlySurplus;
    wealth = {
      snapshot: {
        monthlyIncome: roundMoney(toNumber(wealthProfile.monthlyIncome)),
        monthlyExpenses: roundMoney(toNumber(wealthProfile.monthlyExpenses)),
        monthlyInvestment: roundMoney(investment),
        currentSavings: roundMoney(toNumber(wealthProfile.currentSavings)),
        currentInvestments: roundMoney(toNumber(wealthProfile.currentInvestments)),
        monthlySurplus: surplus,
        monthlyCashChange:
          surplus !== null && investment !== null
            ? roundMoney(surplus - investment)
            : null,
        savingsRate: metrics.savingsRate,
        expenseRatio: metrics.expenseRatio,
        investmentRate: metrics.investmentRate,
        financialStatus: metrics.financialStatus,
      },
      projection: calculateProjectionSeries(wealthProfile, years, {
        annualReturnPercent,
      }),
      emergencyFund: calculateEmergencyFundProjection(wealthProfile, options),
    };
  }

  return {
    wealth,
    health: calculateHealthChartData(healthProfile),
    assumptions: {
      years,
      annualReturnPercent,
      returnsModelled: annualReturnPercent > 0,
      investmentPaidFromSurplus: true,
      contributionTiming: "end_of_month",
      emergencyFundMonths:
        wealth?.emergencyFund.targetMonths ??
        calculateSummary({ healthProfile: null, wealthProfile: null }, options)
          .config.emergencyFundMonths,
    },
  };
}

module.exports = {
  DEFAULT_EMERGENCY_FUND_MONTHS,
  DEFAULT_PROJECTION_YEARS,
  MAX_PROJECTION_YEARS,
  calculateHealthMetrics,
  calculateWealthMetrics,
  calculateSummary,
  calculateProjection,
  calculateSimulation,
  MAX_ILLUSTRATIVE_RETURN_PERCENT,
  calculateProjectionSeries,
  calculateEmergencyFundProjection,
  calculateHealthChartData,
  calculateProjectionsOverview,
};
