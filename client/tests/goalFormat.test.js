// Phase 12 client tests for goal display formatting.
// Run from the client folder with:  node --test tests/goalFormat.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMoney,
  formatProgress,
  formatTargetDate,
  isPastTarget,
} from "../src/components/goals/goalFormat.js";

test("whole amounts show no decimals, in Indian grouping", () => {
  assert.equal(formatMoney(0), "₹0");
  assert.equal(formatMoney(25000), "₹25,000");
  assert.equal(formatMoney(100000), "₹1,00,000");
  assert.equal(formatMoney(1000000000), "₹1,00,00,00,000");
});

test("amounts with paise always show two digits (never ₹80,000.5)", () => {
  assert.equal(formatMoney(80000.5), "₹80,000.50");
  assert.equal(formatMoney(10000.25), "₹10,000.25");
  assert.equal(formatMoney(0.2), "₹0.20");
  assert.equal(formatMoney(99.9), "₹99.90");
});

test("anything that isn't a finite number is a dash, never NaN", () => {
  for (const bad of [null, undefined, NaN, Infinity, "100", {}, []]) {
    assert.equal(formatMoney(bad), "—");
    assert.equal(formatProgress(bad), "—");
  }
});

test("progress shows the percentage", () => {
  assert.equal(formatProgress(0), "0%");
  assert.equal(formatProgress(12.5), "12.5%");
  assert.equal(formatProgress(100), "100%");
});

test("target dates are formatted without timezone shifts", () => {
  assert.equal(formatTargetDate("2027-03-15"), "15 Mar 2027");
  assert.equal(formatTargetDate("2026-01-01"), "1 Jan 2026");
  assert.equal(formatTargetDate("2026-12-31"), "31 Dec 2026");
  for (const bad of [null, undefined, "", "15/03/2027", "2027-3-5", 20270315]) {
    assert.equal(formatTargetDate(bad), "—");
  }
});

test("a goal is past its target only if the date passed and it isn't complete", () => {
  const today = "2026-10-22";
  assert.equal(isPastTarget({ isCompleted: false, targetDate: "2026-10-21" }, today), true);
  assert.equal(isPastTarget({ isCompleted: false, targetDate: "2026-10-22" }, today), false);
  assert.equal(isPastTarget({ isCompleted: false, targetDate: "2027-01-01" }, today), false);
  assert.equal(isPastTarget({ isCompleted: true, targetDate: "2020-01-01" }, today), false);
  assert.equal(isPastTarget({ isCompleted: false, targetDate: null }, today), false);
});
