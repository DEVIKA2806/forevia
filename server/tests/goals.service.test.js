// Phase 12 unit tests for the pure goal logic.
// Run with:  node --test tests/goals.service.test.js
// No database, network or Express involved.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateGoalProgress,
  serializeGoal,
  validateGoalInput,
  MAX_AMOUNT,
  MAX_TITLE_LENGTH,
} = require("../src/services/goal.service");

const NOW = new Date("2026-10-22T12:00:00.000Z");
const valid = (over = {}) => ({
  title: "Emergency fund",
  targetAmount: 100000,
  currentAmount: 25000,
  targetDate: "2027-03-15",
  ...over,
});
const check = (body, context = {}) => validateGoalInput(body, { now: NOW, ...context });

// ------------------------------------------------------------- progress

test("progress: normal case", () => {
  assert.deepEqual(calculateGoalProgress(100000, 25000), {
    progressPercent: 25,
    remainingAmount: 75000,
    isCompleted: false,
  });
});

test("progress: starting from nothing", () => {
  assert.deepEqual(calculateGoalProgress(5000, 0), {
    progressPercent: 0,
    remainingAmount: 5000,
    isCompleted: false,
  });
});

test("progress: exactly reached and exceeded are both complete, capped at 100", () => {
  const exact = calculateGoalProgress(1000, 1000);
  assert.deepEqual(exact, { progressPercent: 100, remainingAmount: 0, isCompleted: true });
  const over = calculateGoalProgress(100, 250);
  assert.deepEqual(over, { progressPercent: 100, remainingAmount: 0, isCompleted: true });
});

test("progress: never shows 100 for an unfinished goal", () => {
  const r = calculateGoalProgress(100000, 99999.5);
  assert.equal(r.isCompleted, false);
  assert.equal(r.progressPercent, 99.9);
  assert.equal(r.remainingAmount, 0.5);
});

test("progress: percentages are not knocked off by float error", () => {
  assert.equal(calculateGoalProgress(100, 57).progressPercent, 57);
  assert.equal(calculateGoalProgress(3, 1).progressPercent, 33.3);
  assert.equal(calculateGoalProgress(0.3, 0.1).progressPercent, 33.3);
  assert.equal(calculateGoalProgress(100, 30).progressPercent, 30);
});

test("progress: remaining is rounded to paise and survives float error", () => {
  assert.equal(calculateGoalProgress(0.3, 0.1).remainingAmount, 0.2);
  assert.equal(calculateGoalProgress(100.1, 0.2).remainingAmount, 99.9);
});

test("progress: a zero or negative target never divides by zero", () => {
  const unknown = { progressPercent: null, remainingAmount: null, isCompleted: false };
  assert.deepEqual(calculateGoalProgress(0, 0), unknown);
  assert.deepEqual(calculateGoalProgress(0, 500), unknown);
  assert.deepEqual(calculateGoalProgress(-100, 50), unknown);
});

test("progress: invalid inputs give 'unknown', never NaN or Infinity", () => {
  const unknown = { progressPercent: null, remainingAmount: null, isCompleted: false };
  for (const [t, c] of [
    [NaN, 5], [100, NaN], [Infinity, 5], [100, Infinity], [null, 5], [100, null],
    [undefined, 5], ["100", 5], [100, "5"], [100, -1],
  ]) {
    assert.deepEqual(calculateGoalProgress(t, c), unknown, `${t}, ${c}`);
  }
});

test("progress: very large amounts stay finite", () => {
  const r = calculateGoalProgress(MAX_AMOUNT, MAX_AMOUNT / 4);
  assert.equal(r.progressPercent, 25);
  assert.ok(Number.isFinite(r.remainingAmount));
});

// ----------------------------------------------------------- serializing

test("serializeGoal: formats the date, adds progress, hides userId", () => {
  const record = {
    id: "g1",
    userId: "SECRET-OWNER",
    title: "Trip",
    targetAmount: 1000,
    currentAmount: 400,
    targetDate: new Date("2027-03-15T00:00:00.000Z"),
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
  };
  const out = serializeGoal(record);
  assert.equal(out.targetDate, "2027-03-15");
  assert.equal(out.progressPercent, 40);
  assert.equal(out.remainingAmount, 600);
  assert.equal(out.isCompleted, false);
  assert.ok(!("userId" in out));
  assert.ok(!JSON.stringify(out).includes("SECRET-OWNER"));
});

test("serializeGoal: no date stays null", () => {
  const out = serializeGoal({ id: "g", title: "x", targetAmount: 10, currentAmount: 0, targetDate: null });
  assert.equal(out.targetDate, null);
});

// ------------------------------------------------------------ validation

test("valid input produces clean data", () => {
  const r = check(valid());
  assert.ok(r.data && !r.errors);
  assert.equal(r.data.title, "Emergency fund");
  assert.equal(r.data.targetAmount, 100000);
  assert.equal(r.data.currentAmount, 25000);
  assert.equal(r.data.targetDate.toISOString(), "2027-03-15T00:00:00.000Z");
});

test("numbers may arrive as strings (forms) or numbers (JSON)", () => {
  const r = check(valid({ targetAmount: "5000.50", currentAmount: " 0 " }));
  assert.equal(r.data.targetAmount, 5000.5);
  assert.equal(r.data.currentAmount, 0);
});

test("a zero current amount and no date are fine", () => {
  const r = check(valid({ currentAmount: 0, targetDate: "" }));
  assert.equal(r.data.currentAmount, 0);
  assert.equal(r.data.targetDate, null);
  assert.equal(check(valid({ targetDate: null })).data.targetDate, null);
  const noDate = valid();
  delete noDate.targetDate;
  assert.equal(check(noDate).data.targetDate, null);
});

test("title: required, trimmed, length-limited, text only", () => {
  assert.equal(check(valid({ title: "  Trip  " })).data.title, "Trip");
  for (const bad of [undefined, null, "", "   "]) {
    assert.equal(check(valid({ title: bad })).errors.title, "Title is required.");
  }
  assert.equal(check(valid({ title: "x".repeat(MAX_TITLE_LENGTH) })).errors, undefined);
  assert.match(check(valid({ title: "x".repeat(MAX_TITLE_LENGTH + 1) })).errors.title, /100 characters or fewer/);
  for (const bad of [123, true, ["a"], { a: 1 }]) {
    assert.equal(check(valid({ title: bad })).errors.title, "Title must be text.");
  }
});

test("target amount: must be a positive number", () => {
  for (const bad of [0, "0", "0.00"]) {
    assert.equal(check(valid({ targetAmount: bad })).errors.targetAmount, "Target amount must be greater than zero.");
  }
  assert.equal(check(valid({ targetAmount: -5 })).errors.targetAmount, "Target amount cannot be negative.");
  assert.equal(check(valid({ targetAmount: "" })).errors.targetAmount, "Target amount is required.");
  assert.equal(check(valid({ targetAmount: null })).errors.targetAmount, "Target amount is required.");
  assert.equal(check(valid({ targetAmount: undefined })).errors.targetAmount, "Target amount is required.");
  assert.equal(check(valid({ targetAmount: 0.01 })).errors, undefined);
});

test("current amount: zero or more, required", () => {
  assert.equal(check(valid({ currentAmount: -1 })).errors.currentAmount, "Current saved amount cannot be negative.");
  assert.equal(check(valid({ currentAmount: "" })).errors.currentAmount, "Current saved amount is required.");
  assert.equal(check(valid({ currentAmount: undefined })).errors.currentAmount, "Current saved amount is required.");
});

test("a saved amount above the target is allowed (goal exceeded)", () => {
  const r = check(valid({ targetAmount: 100, currentAmount: 250 }));
  assert.ok(r.data);
});

test("amounts reject anything that isn't a plain number", () => {
  for (const bad of ["abc", "12abc", "1e3", "0x10", "Infinity", "NaN", "--5", "1,000", true, false, [5], ["5"], { a: 1 }, NaN, Infinity]) {
    const r = check(valid({ targetAmount: bad, currentAmount: bad }));
    assert.ok(r.errors && r.errors.targetAmount && r.errors.currentAmount, `accepted ${JSON.stringify(bad)}`);
  }
});

test("amounts: upper limit and at most 2 decimal places", () => {
  assert.equal(check(valid({ targetAmount: MAX_AMOUNT })).errors, undefined);
  assert.match(check(valid({ targetAmount: MAX_AMOUNT + 1 })).errors.targetAmount, /or less/);
  assert.equal(check(valid({ targetAmount: "100.25" })).errors, undefined);
  assert.equal(check(valid({ targetAmount: "100.255" })).errors.targetAmount, "Target amount can have at most 2 decimal places.");
  assert.equal(check(valid({ currentAmount: 0.001 })).errors.currentAmount, "Current saved amount can have at most 2 decimal places.");
});

test("amounts are stored without float noise", () => {
  const r = check(valid({ targetAmount: 0.1 + 0.2, currentAmount: "19.99" }));
  assert.equal(r.data.targetAmount, 0.3);
  assert.equal(r.data.currentAmount, 19.99);
});

test("target date: must be a real calendar date", () => {
  for (const bad of ["2027-02-30", "2027-13-01", "2027-00-10", "2027-04-31", "2027-02-29", "15/03/2027", "2027-3-5", "tomorrow", "2027-03-15T00:00:00Z", 20270315, true, {}, []]) {
    assert.equal(check(valid({ targetDate: bad })).errors?.targetDate, "Target date must be a valid date.", JSON.stringify(bad));
  }
  assert.ok(check(valid({ targetDate: "2028-02-29" })).data, "leap day is valid");
  assert.ok(check(valid({ targetDate: " 2027-03-15 " })).data, "whitespace is trimmed");
});

test("target date: not in the past, with one day of timezone leeway", () => {
  assert.ok(check(valid({ targetDate: "2026-10-22" })).data, "today");
  assert.ok(check(valid({ targetDate: "2026-10-21" })).data, "yesterday (leeway)");
  assert.equal(check(valid({ targetDate: "2026-10-20" })).errors.targetDate, "Target date can't be in the past.");
  assert.equal(check(valid({ targetDate: "2020-01-01" })).errors.targetDate, "Target date can't be in the past.");
});

test("target date: an unchanged date that has since passed does not block editing", () => {
  const body = valid({ targetDate: "2025-01-01" });
  assert.equal(check(body).errors.targetDate, "Target date can't be in the past.");
  assert.ok(check(body, { previousTargetDate: "2025-01-01" }).data);
  // ...but changing it to a different past date is still rejected.
  assert.ok(check(valid({ targetDate: "2025-02-02" }), { previousTargetDate: "2025-01-01" }).errors.targetDate);
});

test("target date: sensible year range", () => {
  assert.equal(check(valid({ targetDate: "2100-12-31" })).errors, undefined);
  assert.match(check(valid({ targetDate: "2101-01-01" })).errors.targetDate, /between the years 2000 and 2100/);
  assert.match(check(valid({ targetDate: "1999-12-31" })).errors.targetDate, /between the years 2000 and 2100/);
});

test("all errors are reported together, keyed by field", () => {
  const r = check({ title: "", targetAmount: -1, currentAmount: "x", targetDate: "nope" });
  assert.deepEqual(Object.keys(r.errors).sort(), ["currentAmount", "targetAmount", "targetDate", "title"]);
  assert.equal(r.data, undefined);
});

test("only the four editable fields are read; id/userId/createdAt are ignored", () => {
  const r = check(valid({ id: "evil", userId: "someone-else", createdAt: "2000-01-01", isCompleted: true, progressPercent: 100 }));
  assert.deepEqual(Object.keys(r.data).sort(), ["currentAmount", "targetAmount", "targetDate", "title"]);
});

test("a missing or non-object body is a set of errors, not a crash", () => {
  for (const body of [undefined, null, "text", 42, []]) {
    const r = check(body);
    assert.ok(r.errors && r.errors.title && r.errors.targetAmount && r.errors.currentAmount, JSON.stringify(body));
  }
});

test("validation does not modify the object it is given", () => {
  const body = valid({ title: "  Trip  ", userId: "x" });
  const before = JSON.stringify(body);
  check(body);
  assert.equal(JSON.stringify(body), before);
});
