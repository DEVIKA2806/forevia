// Phase 11 tests. Run with:  node --test tests/projections.test.js
// Uses Node's built-in test runner: no extra dependency, no database, no
// network and no AI provider.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateProjection,
  calculateProjectionSeries,
  calculateEmergencyFundProjection,
  calculateHealthChartData,
  calculateProjectionsOverview,
} = require("../src/services/calculation.service");

// A saved wealth profile with sensible defaults; override per test.
const wealth = (overrides = {}) => ({
  monthlyIncome: 100000,
  monthlyExpenses: 60000,
  monthlyInvestment: 10000,
  currentSavings: 50000,
  currentInvestments: 200000,
  existingDebt: 0,
  ...overrides,
});

const allFinite = (series) =>
  series.every((p) =>
    [p.month, p.cashSavings, p.investments, p.total].every(Number.isFinite)
  );

// ---------------------------------------------------------------- series

test("positive surplus: cash grows by surplus minus investment; investments by investment", () => {
  const r = calculateProjectionSeries(wealth(), 1); // surplus 40k, invest 10k
  assert.equal(r.months, 12);
  assert.equal(r.series.length, 13); // month 0..12
  assert.equal(r.monthlyCashChange, 30000);
  assert.deepEqual(r.series[0], {
    month: 0,
    cashSavings: 50000,
    investments: 200000,
    total: 250000,
  });
  assert.equal(r.end.cashSavings, 50000 + 30000 * 12);
  assert.equal(r.end.investments, 200000 + 10000 * 12);
  assert.equal(r.cashDepletionMonth, null);
  assert.equal(r.breakdown.illustrativeGrowth, 0);
});

test("no double counting: total grows by the surplus only", () => {
  const p = wealth();
  const r = calculateProjectionSeries(p, 3);
  const surplus = p.monthlyIncome - p.monthlyExpenses;
  assert.equal(
    r.end.total,
    p.currentSavings + p.currentInvestments + surplus * 36
  );
});

test("series end matches the Phase 9 calculateProjection (no returns)", () => {
  for (const years of [1, 3, 5, 10]) {
    for (const p of [
      wealth(),
      wealth({ monthlyExpenses: 100000 }),
      wealth({ monthlyExpenses: 120000 }),
      wealth({ monthlyInvestment: 55000 }),
    ]) {
      const series = calculateProjectionSeries(p, years);
      const phase9 = calculateProjection(p, years);
      assert.equal(series.end.cashSavings, phase9.projectedSavings);
      assert.equal(series.end.investments, phase9.projectedInvestments);
      assert.equal(series.end.total, phase9.projectedTotal);
    }
  }
});

test("zero surplus: cash stays flat when nothing is invested", () => {
  const r = calculateProjectionSeries(
    wealth({ monthlyExpenses: 100000, monthlyInvestment: 0 }),
    5
  );
  assert.equal(r.monthlyCashChange, 0);
  assert.ok(r.series.every((p) => p.cashSavings === 50000));
  assert.equal(r.cashDepletionMonth, null);
});

test("zero surplus with investing: cash falls by the investment (a shortfall, not hidden)", () => {
  const r = calculateProjectionSeries(
    wealth({ monthlyExpenses: 100000, monthlyInvestment: 10000 }),
    1
  );
  assert.equal(r.monthlyCashChange, -10000);
  assert.equal(r.end.cashSavings, 50000 - 120000);
  assert.equal(r.cashDepletionMonth, 6); // 50k - 10k*6 = -10k first below 0
});

test("negative surplus: cash declines, goes negative, depletion month reported", () => {
  const r = calculateProjectionSeries(
    wealth({ monthlyExpenses: 110000, monthlyInvestment: 0, currentSavings: 25000 }),
    1
  ); // -10k per month
  assert.equal(r.monthlyCashChange, -10000);
  assert.equal(r.series[2].cashSavings, 5000);
  assert.equal(r.series[3].cashSavings, -5000);
  assert.equal(r.cashDepletionMonth, 3);
  assert.equal(r.end.cashSavings, 25000 - 120000);
  assert.ok(allFinite(r.series));
});

test("zero savings and a deficit: depletion in month 1", () => {
  const r = calculateProjectionSeries(
    wealth({ monthlyExpenses: 110000, monthlyInvestment: 0, currentSavings: 0 }),
    1
  );
  assert.equal(r.cashDepletionMonth, 1);
});

test("all zeros is valid and flat", () => {
  const r = calculateProjectionSeries(
    wealth({
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlyInvestment: 0,
      currentSavings: 0,
      currentInvestments: 0,
    }),
    1
  );
  assert.equal(r.end.total, 0);
  assert.ok(allFinite(r.series));
});

test("illustrative return: closed-form value, applied to investments only", () => {
  // 12% a year = 1% a month. C = 1000 at month end, 12 months, I0 = 0:
  // 1000 * ((1.01^12 - 1) / 0.01) = 12682.50
  const r = calculateProjectionSeries(
    wealth({
      monthlyIncome: 5000,
      monthlyExpenses: 3000,
      monthlyInvestment: 1000,
      currentSavings: 0,
      currentInvestments: 0,
    }),
    1,
    { annualReturnPercent: 12 }
  );
  assert.equal(r.end.investments, 12682.5);
  assert.equal(r.end.cashSavings, 12000); // (2000-1000) * 12, no interest on cash
  assert.equal(r.breakdown.investmentContributions, 12000);
  assert.equal(r.breakdown.illustrativeGrowth, 682.5);
  assert.equal(r.annualReturnPercent, 12);
});

test("illustrative return on an existing balance compounds monthly", () => {
  const r = calculateProjectionSeries(
    wealth({ monthlyInvestment: 0, currentInvestments: 100000 }),
    1,
    { annualReturnPercent: 12 }
  );
  // 100000 * 1.01^12 = 112682.50
  assert.equal(r.end.investments, 112682.5);
});

test("a return of 0 or omitted gives the no-returns result", () => {
  const none = calculateProjectionSeries(wealth(), 5);
  const zero = calculateProjectionSeries(wealth(), 5, { annualReturnPercent: 0 });
  assert.deepEqual(none.end, zero.end);
  assert.equal(none.annualReturnPercent, 0);
});

test("invalid inputs return an empty result, never NaN", () => {
  const isEmpty = (r) => r.series.length === 0 && r.end === null;
  assert.ok(isEmpty(calculateProjectionSeries(null, 5)));
  assert.ok(isEmpty(calculateProjectionSeries(undefined, 5)));
  for (const bad of [0, 51, -1, 2.5, "abc", null, undefined, NaN, Infinity]) {
    assert.ok(isEmpty(calculateProjectionSeries(wealth(), bad)), `years=${bad}`);
  }
  for (const bad of [-1, 21, Infinity]) {
    assert.ok(
      isEmpty(calculateProjectionSeries(wealth(), 5, { annualReturnPercent: bad })),
      `rate=${bad}`
    );
  }
  for (const field of [
    "monthlyIncome",
    "monthlyExpenses",
    "monthlyInvestment",
    "currentSavings",
    "currentInvestments",
  ]) {
    assert.ok(isEmpty(calculateProjectionSeries(wealth({ [field]: -1 }), 5)), `${field} < 0`);
    assert.ok(isEmpty(calculateProjectionSeries(wealth({ [field]: null }), 5)), `${field} null`);
    assert.ok(isEmpty(calculateProjectionSeries(wealth({ [field]: "x" }), 5)), `${field} text`);
  }
});

test("the longest period (50 years) is finite", () => {
  const r = calculateProjectionSeries(wealth(), 50, { annualReturnPercent: 20 });
  assert.equal(r.series.length, 601);
  assert.ok(allFinite(r.series));
});

// ------------------------------------------------------- emergency fund

test("emergency fund: reachable, exact division", () => {
  // target = 50000 * 3 = 150000; saved 120000 -> gap 30000; +10000/month
  const r = calculateEmergencyFundProjection(
    wealth({
      monthlyIncome: 70000,
      monthlyExpenses: 50000,
      monthlyInvestment: 10000,
      currentSavings: 120000,
    })
  );
  assert.equal(r.status, "reachable");
  assert.equal(r.target, 150000);
  assert.equal(r.gap, 30000);
  assert.equal(r.monthlyContribution, 10000);
  assert.equal(r.monthsToTarget, 3);
});

test("emergency fund: months round UP", () => {
  const r = calculateEmergencyFundProjection(
    wealth({
      monthlyIncome: 70000,
      monthlyExpenses: 50000,
      monthlyInvestment: 10000,
      currentSavings: 125000, // gap 25000 / 10000 = 2.5 -> 3
    })
  );
  assert.equal(r.monthsToTarget, 3);
});

test("emergency fund: already reached (including exactly at target)", () => {
  const above = calculateEmergencyFundProjection(wealth({ currentSavings: 500000 }));
  assert.equal(above.status, "reached");
  assert.equal(above.monthsToTarget, 0);
  assert.equal(above.gap, 0);
  const exact = calculateEmergencyFundProjection(wealth({ currentSavings: 180000 }));
  assert.equal(exact.status, "reached");
});

test("emergency fund: reached even with a deficit (status describes today)", () => {
  const r = calculateEmergencyFundProjection(
    wealth({ monthlyExpenses: 110000, currentSavings: 400000 })
  );
  assert.equal(r.status, "reached");
});

test("emergency fund: zero or negative monthly cash change is not reachable", () => {
  const zero = calculateEmergencyFundProjection(
    wealth({ monthlyExpenses: 90000, monthlyInvestment: 10000, currentSavings: 0 })
  );
  assert.equal(zero.status, "not_reachable");
  assert.equal(zero.monthsToTarget, null);
  const negative = calculateEmergencyFundProjection(
    wealth({ monthlyExpenses: 120000, currentSavings: 0 })
  );
  assert.equal(negative.status, "not_reachable");
  // Investing more than the surplus is a negative cash change too.
  const overInvest = calculateEmergencyFundProjection(
    wealth({ monthlyInvestment: 50000, currentSavings: 0 })
  );
  assert.equal(overInvest.monthlyContribution, -10000);
  assert.equal(overInvest.status, "not_reachable");
});

test("emergency fund: reachable only after more than 50 years is 'too_far'", () => {
  const r = calculateEmergencyFundProjection(
    wealth({
      monthlyIncome: 60001,
      monthlyExpenses: 60000,
      monthlyInvestment: 0,
      currentSavings: 0,
    })
  ); // gap 180000 at +1/month
  assert.equal(r.status, "too_far");
  assert.equal(r.monthsToTarget, null);
});

test("emergency fund: zero expenses means no target; missing profile is missing_data", () => {
  const none = calculateEmergencyFundProjection(
    wealth({ monthlyExpenses: 0, monthlyIncome: 0, monthlyInvestment: 0 })
  );
  assert.equal(none.status, "no_target");
  const missing = calculateEmergencyFundProjection(null);
  assert.equal(missing.status, "missing_data");
  assert.equal(missing.target, null);
  const noExpenses = calculateEmergencyFundProjection(wealth({ monthlyExpenses: null }));
  assert.equal(noExpenses.status, "missing_data");
});

test("emergency fund does not invent savings the user hasn't entered", () => {
  const r = calculateEmergencyFundProjection(wealth({ currentSavings: 0 }));
  assert.equal(r.current, 0);
  assert.equal(r.gap, r.target);
  assert.equal(r.coverage, 0);
});

// ---------------------------------------------------------------- health

test("health chart data: BMI, bands, activity order", () => {
  const h = calculateHealthChartData({
    age: 30, heightCm: 175, weightKg: 70, activityLevel: "moderate",
    sleepHours: 7, smokingStatus: "never", alcoholUse: "never",
  });
  assert.equal(h.bmi, 22.9);
  assert.equal(h.bmiCategory, "normal");
  assert.equal(h.bmiCategoryApplicable, true);
  assert.deepEqual(h.bmiScale.map((b) => b.key), ["underweight", "normal", "overweight", "obese"]);
  assert.deepEqual(h.bmiScale.map((b) => b.min), [0, 18.5, 25, 30]);
  assert.equal(h.bmiScale[3].max, null);
  assert.deepEqual(h.activityLevels, ["sedentary", "light", "moderate", "active"]);
  assert.equal(h.sleepHours, 7);
});

test("health chart data: under 18 has BMI but no category; null profile is null", () => {
  const h = calculateHealthChartData({ age: 15, heightCm: 165, weightKg: 55, activityLevel: "light", sleepHours: 8 });
  assert.equal(typeof h.bmi, "number");
  assert.equal(h.bmiCategory, null);
  assert.equal(h.bmiCategoryApplicable, false);
  assert.equal(calculateHealthChartData(null), null);
  const noBmi = calculateHealthChartData({ age: 30, heightCm: 0, weightKg: 70, activityLevel: "light", sleepHours: 7 });
  assert.equal(noBmi.bmi, null);
});

// -------------------------------------------------------------- overview

test("overview: missing profiles give null sections, with assumptions still present", () => {
  const r = calculateProjectionsOverview({ healthProfile: null, wealthProfile: null }, {});
  assert.equal(r.wealth, null);
  assert.equal(r.health, null);
  assert.equal(r.assumptions.years, 5);
  assert.equal(r.assumptions.returnsModelled, false);
  assert.equal(r.assumptions.investmentPaidFromSurplus, true);
});

test("overview: wealth only / health only", () => {
  const w = calculateProjectionsOverview({ healthProfile: null, wealthProfile: wealth() }, { years: 3 });
  assert.ok(w.wealth);
  assert.equal(w.health, null);
  assert.equal(w.wealth.projection.years, 3);
  assert.equal(w.wealth.snapshot.monthlySurplus, 40000);
  assert.equal(w.wealth.snapshot.monthlyCashChange, 30000);
  assert.equal(w.wealth.snapshot.savingsRate, 40);
  assert.equal(w.wealth.snapshot.expenseRatio, 60);
  const h = calculateProjectionsOverview(
    { healthProfile: { age: 30, heightCm: 175, weightKg: 70, activityLevel: "light", sleepHours: 7 }, wealthProfile: null },
    {}
  );
  assert.equal(h.wealth, null);
  assert.ok(h.health);
});

test("overview: returns flag follows the chosen rate", () => {
  const r = calculateProjectionsOverview({ healthProfile: null, wealthProfile: wealth() }, { years: 5, annualReturnPercent: 8 });
  assert.equal(r.assumptions.returnsModelled, true);
  assert.equal(r.wealth.projection.annualReturnPercent, 8);
  assert.ok(r.wealth.projection.breakdown.illustrativeGrowth > 0);
});

test("overview: zero income gives null ratios, not NaN or Infinity", () => {
  const r = calculateProjectionsOverview(
    { healthProfile: null, wealthProfile: wealth({ monthlyIncome: 0, monthlyExpenses: 0, monthlyInvestment: 0 }) },
    {}
  );
  const s = r.wealth.snapshot;
  assert.equal(s.savingsRate, null);
  assert.equal(s.expenseRatio, null);
  assert.equal(s.investmentRate, null);
  assert.equal(s.financialStatus, "insufficient_data");
  assert.ok(!JSON.stringify(r).includes("NaN"));
});

test("overview does not modify the profile it was given", () => {
  const p = wealth();
  const before = JSON.stringify(p);
  calculateProjectionsOverview({ healthProfile: null, wealthProfile: p }, { years: 10, annualReturnPercent: 8 });
  assert.equal(JSON.stringify(p), before);
});

// ------------------------------------------------------------ controller

const path = require("node:path");
const prismaPath = require.resolve("../src/config/prisma");
let prismaCalls = [];
let prismaBehaviour = { health: null, wealth: null, fail: false };
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: {
    healthProfile: {
      findUnique: async (args) => {
        prismaCalls.push(["health", args]);
        if (prismaBehaviour.fail) throw new Error("db down: secret detail");
        return prismaBehaviour.health;
      },
    },
    wealthProfile: {
      findUnique: async (args) => {
        prismaCalls.push(["wealth", args]);
        if (prismaBehaviour.fail) throw new Error("db down: secret detail");
        return prismaBehaviour.wealth;
      },
    },
  },
};
const { getProjections } = require(path.join("..", "src", "controllers", "projection.controller"));

function run(query = {}, userId = "user-1") {
  prismaCalls = [];
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(k, v) { this.headers[k] = v; return this; },
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, headers: this.headers, body }); return this; },
    };
    getProjections({ query, user: { id: userId }, body: { userId: "attacker" }, params: { id: "attacker" } }, res);
  });
}

test("controller: 200, defaults, no-store, only the signed-in user's rows", async () => {
  prismaBehaviour = { health: null, wealth: wealth(), fail: false };
  const r = await run({}, "user-42");
  assert.equal(r.status, 200);
  assert.equal(r.headers["Cache-Control"], "no-store");
  assert.equal(r.body.assumptions.years, 5);
  assert.equal(r.body.assumptions.annualReturnPercent, 0);
  assert.equal(r.body.wealth.projection.series.length, 61);
  assert.equal(r.body.health, null);
  for (const [, args] of prismaCalls) assert.deepEqual(args, { where: { userId: "user-42" } });
});

test("controller: accepts valid years and illustrative return", async () => {
  prismaBehaviour = { health: null, wealth: wealth(), fail: false };
  const r = await run({ years: "10", annualReturn: "8" });
  assert.equal(r.status, 200);
  assert.equal(r.body.assumptions.years, 10);
  assert.equal(r.body.assumptions.returnsModelled, true);
  assert.equal(r.body.wealth.projection.series.length, 121);
});

test("controller: both profiles missing is a normal 200 with nulls", async () => {
  prismaBehaviour = { health: null, wealth: null, fail: false };
  const r = await run({});
  assert.equal(r.status, 200);
  assert.equal(r.body.wealth, null);
  assert.equal(r.body.health, null);
});

test("controller: rejects invalid settings with 400 and does not touch the database", async () => {
  prismaBehaviour = { health: null, wealth: wealth(), fail: false };
  const bad = [
    { years: "0" }, { years: "51" }, { years: "-3" }, { years: "2.5" },
    { years: "abc" }, { years: "NaN" }, { years: "Infinity" },
    { years: ["1", "2"] }, { years: { a: "1" } },
    { annualReturn: "-1" }, { annualReturn: "21" }, { annualReturn: "abc" },
    { annualReturn: ["5", "6"] },
  ];
  for (const query of bad) {
    const r = await run(query);
    assert.equal(r.status, 400, JSON.stringify(query));
    assert.ok(r.body.errors, JSON.stringify(query));
    assert.equal(prismaCalls.length, 0, `no DB call for ${JSON.stringify(query)}`);
  }
});

test("controller: blank values fall back to defaults", async () => {
  prismaBehaviour = { health: null, wealth: wealth(), fail: false };
  const r = await run({ years: "", annualReturn: "  " });
  assert.equal(r.status, 200);
  assert.equal(r.body.assumptions.years, 5);
});

test("controller: database failure is a generic 500 that leaks nothing", async () => {
  prismaBehaviour = { health: null, wealth: null, fail: true };
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const r = await run({});
    assert.equal(r.status, 500);
    assert.equal(r.body.message, "Unable to calculate your projections.");
    assert.ok(!JSON.stringify(r.body).includes("secret"));
    assert.ok(!logged.join(" ").includes("secret"));
  } finally {
    console.error = original;
  }
});
