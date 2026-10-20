ALTER TABLE "expenses"
ADD COLUMN "deletedAt" TIMESTAMPTZ(6);

ALTER TABLE "groups"
ADD COLUMN "deletedAt" TIMESTAMPTZ(6);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "expenses" AS e
    LEFT JOIN "expense_splits" AS s ON s."expenseId" = e."id"
    WHERE e."category" = 'SETTLEMENT'
    GROUP BY e."id"
    HAVING COUNT(s."id") <> 1
  ) THEN
    RAISE EXCEPTION 'Legacy settlement rows must have exactly one split before migration';
  END IF;
END $$;

WITH legacy AS MATERIALIZED (
  SELECT
    e."id" AS expense_id,
    e."paidBy" AS debtor_id,
    s."userId" AS creditor_id,
    s."id" AS split_id
  FROM "expenses" AS e
  JOIN "expense_splits" AS s ON s."expenseId" = e."id"
  WHERE e."category" = 'SETTLEMENT'
),
updated_expenses AS (
  UPDATE "expenses" AS e
  SET "paidBy" = legacy.creditor_id
  FROM legacy
  WHERE e."id" = legacy.expense_id
  RETURNING e."id"
)
UPDATE "expense_splits" AS s
SET "userId" = legacy.debtor_id
FROM legacy
JOIN updated_expenses AS changed ON changed."id" = legacy.expense_id
WHERE s."id" = legacy.split_id;

CREATE INDEX "idx_expenses_groupId_deletedAt"
ON "expenses"("groupId", "deletedAt");

CREATE INDEX "idx_groups_deletedAt"
ON "groups"("deletedAt");
