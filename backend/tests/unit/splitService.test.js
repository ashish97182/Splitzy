import test from "node:test";
import assert from "node:assert/strict";
import calculateSplits from "../../services/splitService.js";
import { toMinorUnits } from "../../services/money.js";

const participants = ["a", "b", "c"];

function assertSplitsTotal(result, expectedMinorUnits) {
  assert.equal(result.reduce((total, split) => total + toMinorUnits(split.amount), 0), expectedMinorUnits);
  assert.ok(result.every((split) => split.amount >= 0));
}

test("EQUAL allocates odd minor units without losing money", () => {
  const result = calculateSplits({
    amount: 10.01,
    splitType: "EQUAL",
    participants,
  });

  assertSplitsTotal(result, 1001);
  assert.deepEqual(result.map((split) => split.amount), [3.34, 3.34, 3.33]);
});

test("EXACT preserves zero shares and exact minor-unit totals", () => {
  const result = calculateSplits({
    amount: 10.01,
    splitType: "EXACT",
    participants,
    values: [0, 3, 7.01],
  });

  assertSplitsTotal(result, 1001);
  assert.equal(result[0].amount, 0);
});

test("PERCENTAGE distributes rounding remainder deterministically", () => {
  const result = calculateSplits({
    amount: 10.01,
    splitType: "PERCENTAGE",
    participants,
    values: [33.33, 33.33, 33.34],
  });

  assertSplitsTotal(result, 1001);
});

test("SHARES supports zero-valued participants and conserves totals", () => {
  const result = calculateSplits({
    amount: 10.01,
    splitType: "SHARES",
    participants,
    values: [0, 1, 2],
  });

  assertSplitsTotal(result, 1001);
  assert.equal(result[0].amount, 0);
});

test("split calculation rejects duplicate participants and non-positive amounts", () => {
  assert.throws(() => calculateSplits({
    amount: 10,
    splitType: "EQUAL",
    participants: ["a", "a"],
  }), /duplicate/);
  assert.throws(() => calculateSplits({
    amount: 0,
    splitType: "EQUAL",
    participants,
  }), /greater than 0/);
});
