export async function lockActiveGroup(transaction, groupId) {
  const rows = await transaction.$queryRaw`
    SELECT "id"
    FROM "groups"
    WHERE "id" = ${groupId}::uuid AND "deletedAt" IS NULL
    FOR UPDATE
  `;
  return rows.length > 0;
}
