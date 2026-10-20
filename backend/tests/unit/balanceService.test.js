import test from "node:test";
import assert from "node:assert/strict";
import { calculateBalanceTotals } from "../../services/balanceMath.js";
import { fromMinorUnits } from "../../services/money.js";

test("balance totals use paise and sum to zero for balanced expense splits", () => {
  const balances = calculateBalanceTotals([
    {
      paidBy: "payer",
      amount: "10.01",
      expense_splits: [
        { userId: "payer", amount: "3.34" },
        { userId: "a", amount: "3.34" },
        { userId: "b", amount: "3.33" },
      ],
    },
  ]);

  assert.deepEqual(
    Object.fromEntries(Object.entries(balances).map(([userId, value]) => [userId, fromMinorUnits(value)])),
    { payer: 6.67, a: -3.34, b: -3.33 },
  );
  assert.equal(Object.values(balances).reduce((sum, value) => sum + value, 0), 0);
});
