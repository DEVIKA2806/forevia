// Phase 12 client tests for the goal form validation.
// Run from the client folder with:  node --test tests/goalValidation.test.js
// (Node's built-in runner: no extra package needed.)
import test from "node:test";
import assert from "node:assert/strict";
import { validateGoalForm, todayLocalIso, GOAL_LIMITS } from "../src/utils/goalValidation.js";

const TODAY = "2026-10-22";
const ok = (over = {}) => ({
  title: "Emergency fund",
  targetAmount: "100000",
  currentAmount: "25000",
  targetDate: "2027-03-15",
  ...over,
});
const check = (values, ctx = {}) => validateGoalForm(values, { today: TODAY, ...ctx });

test("valid values give no errors", () => {
  assert.deepEqual(check(ok()), {});
  assert.deepEqual(check(ok({ currentAmount: "0", targetDate: "" })), {});
});

test("title: required, trimmed, at most 100 characters", () => {
  assert.equal(check(ok({ title: "" })).title, "Title is required.");
  assert.equal(check(ok({ title: "   " })).title, "Title is required.");
  assert.deepEqual(check(ok({ title: "x".repeat(GOAL_LIMITS.titleMax) })), {});
  assert.match(check(ok({ title: "x".repeat(101) })).title, /100 characters or fewer/);
});

test("target amount must be greater than zero", () => {
  assert.equal(check(ok({ targetAmount: "" })).targetAmount, "Target amount is required.");
  assert.equal(check(ok({ targetAmount: "0" })).targetAmount, "Target amount must be greater than zero.");
  assert.equal(check(ok({ targetAmount: "-5" })).targetAmount, "Target amount cannot be negative.");
  assert.deepEqual(check(ok({ targetAmount: "0.01" })), {});
});

test("current amount may be zero but not negative or blank", () => {
  assert.deepEqual(check(ok({ currentAmount: "0" })), {});
  assert.equal(check(ok({ currentAmount: "-1" })).currentAmount, "Current saved amount cannot be negative.");
  assert.equal(check(ok({ currentAmount: "" })).currentAmount, "Current saved amount is required.");
});

test("amounts reject non-plain numbers, too many decimals and huge values", () => {
  for (const bad of ["abc", "12abc", "1e3", "0x10", "Infinity", "NaN", "1,000", "--5"]) {
    assert.ok(check(ok({ targetAmount: bad })).targetAmount, `accepted ${bad}`);
  }
  assert.equal(check(ok({ targetAmount: "10.255" })).targetAmount, "Target amount can have at most 2 decimal places.");
  assert.deepEqual(check(ok({ targetAmount: "10.25" })), {});
  assert.match(check(ok({ targetAmount: "1000000001" })).targetAmount, /or less/);
});

test("a saved amount above the target is allowed", () => {
  assert.deepEqual(check(ok({ targetAmount: "100", currentAmount: "250" })), {});
});

test("target date: optional, real calendar date, sensible years", () => {
  assert.deepEqual(check(ok({ targetDate: "" })), {});
  for (const bad of ["2027-02-30", "2027-13-01", "15/03/2027", "2027-3-5", "tomorrow"]) {
    assert.equal(check(ok({ targetDate: bad })).targetDate, "Target date must be a valid date.", bad);
  }
  assert.deepEqual(check(ok({ targetDate: "2028-02-29" })), {});
  assert.match(check(ok({ targetDate: "2101-01-01" })).targetDate, /between the years/);
});

test("target date: not in the past, unless unchanged from the saved one", () => {
  assert.deepEqual(check(ok({ targetDate: TODAY })), {});
  assert.equal(check(ok({ targetDate: "2026-10-21" })).targetDate, "Target date can't be in the past.");
  assert.deepEqual(check(ok({ targetDate: "2025-01-01" }), { originalTargetDate: "2025-01-01" }), {});
  assert.ok(check(ok({ targetDate: "2025-02-02" }), { originalTargetDate: "2025-01-01" }).targetDate);
});

test("every problem is reported at once", () => {
  const errors = check({ title: "", targetAmount: "0", currentAmount: "x", targetDate: "no" });
  assert.deepEqual(Object.keys(errors).sort(), ["currentAmount", "targetAmount", "targetDate", "title"]);
});

test("todayLocalIso uses the local calendar date, zero-padded", () => {
  assert.equal(todayLocalIso(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(todayLocalIso(new Date(2026, 11, 31, 0, 0)), "2026-12-31");
});
