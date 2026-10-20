import test from "node:test";
import assert from "node:assert/strict";
import simplifyDebts from "../../services/debtService.js";
import { toMinorUnits } from "../../services/money.js";

test("debt simplification conserves exact minor units", () => {
  const transactions = simplifyDebts({
    debtor: -12.34,
    firstCreditor: 5.01,
    secondCreditor: 7.33,
  });

  assert.deepEqual(transactions, [
    { from: "debtor", to: "firstCreditor", amount: 5.01 },
    { from: "debtor", to: "secondCreditor", amount: 7.33 },
  ]);
  assert.equal(
    transactions.reduce((sum, transaction) => sum + toMinorUnits(transaction.amount), 0),
    1234,
  );
});
