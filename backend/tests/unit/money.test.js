import test from "node:test";
import assert from "node:assert/strict";
import { fromMinorUnits, toMinorUnits } from "../../services/money.js";

test("money conversion retains exact minor units", () => {
  assert.equal(toMinorUnits("13.07"), 1307);
  assert.equal(toMinorUnits("0.30"), 30);
  assert.equal(fromMinorUnits(1307), 13.07);
});

test("money conversion rejects unsupported precision and unsafe amounts", () => {
  assert.throws(() => toMinorUnits("1.001"), /two decimal places/);
  assert.throws(() => toMinorUnits(Number.MAX_SAFE_INTEGER), /supported range/);
});
