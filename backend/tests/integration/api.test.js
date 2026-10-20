import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test("HTTP auth, group permissions, ledger rules, and soft deletion", {
  skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to an isolated PostgreSQL test database.",
}, async (t) => {
  const parsedTestUrl = new URL(testDatabaseUrl);
  const databaseName = `${parsedTestUrl.pathname} ${parsedTestUrl.searchParams.get("schema") ?? ""}`;
  assert.match(databaseName, /test/i, "TEST_DATABASE_URL must name an isolated test database or schema.");

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_SECRET = "integration-test-access-secret-0123456789";
  process.env.JWT_REFRESH_SECRET = "integration-test-refresh-secret-0123456789";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.CLIENT_ORIGINS = "";
  for (const key of ["EMAIL_USER", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET", "OAUTH_REFRESH_TOKEN"]) {
    process.env[key] = "";
  }

  const [{ default: prisma }, { default: app }] = await Promise.all([
    import("../../src/config/db.js"),
    import("../../src/app.js"),
  ]);
  await prisma.$connect();

  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const createdUserIds = [];
  let groupId;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    if (groupId) {
      const expenses = await prisma.expenses.findMany({
        where: { groupId },
        select: { id: true },
      });
      const expenseIds = expenses.map((expense) => expense.id);
      await prisma.expense_splits.deleteMany({
        where: { expenseId: { in: expenseIds } },
      });
      await prisma.expenses.deleteMany({ where: { groupId } });
      await prisma.group_members.deleteMany({ where: { groupId } });
      await prisma.groups.deleteMany({ where: { id: groupId } });
    }
    await prisma.users.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createUser(name) {
    const user = await prisma.users.create({
      data: {
        name,
        email: `${randomUUID()}@example.invalid`,
        passwordHash: await bcrypt.hash("integration-password", 4),
        avatar: "",
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  function accessToken(user) {
    return jwt.sign(
      { userId: user.id, name: user.name, tokenType: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
  }

  async function request(path, { token, ...options } = {}) {
    const headers = new Headers(options.headers);
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(`${origin}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  }

  const admin = await createUser("Admin");
  const payer = await createUser("Payer");
  const payee = await createUser("Payee");
  const invitee = await createUser("Invitee");
  const passwordHash = await bcrypt.hash("integration-password", 4);
  await prisma.users.update({
    where: { id: payer.id },
    data: { passwordHash },
  });

  const group = await prisma.groups.create({
    data: { name: "Integration group", description: "", createdBy: admin.id },
  });
  groupId = group.id;
  await prisma.group_members.createMany({
    data: [
      { groupId, userId: admin.id, role: "ADMIN" },
      { groupId, userId: payer.id, role: "MEMBER" },
      { groupId, userId: payee.id, role: "MEMBER" },
    ],
  });

  const adminToken = accessToken(admin);
  const payerToken = accessToken(payer);
  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    body: { email: payer.email, password: "integration-password" },
  });
  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  const originalCookie = loginResponse.headers.get("set-cookie")?.match(/jwt=([^;]+)/)?.[1];
  assert.ok(originalCookie);

  const noAccessToken = await request("/api/auth/logout-all", { method: "POST" });
  assert.equal(noAccessToken.status, 401);

  const refreshResponse = await request("/api/auth/refresh", {
    method: "POST",
    headers: { cookie: `jwt=${originalCookie}` },
  });
  assert.equal(refreshResponse.status, 200);
  const rotatedCookie = refreshResponse.headers.get("set-cookie")?.match(/jwt=([^;]+)/)?.[1];
  assert.ok(rotatedCookie);

  const replayResponse = await request("/api/auth/refresh", {
    method: "POST",
    headers: { cookie: `jwt=${originalCookie}` },
  });
  assert.equal(replayResponse.status, 401);

  const logoutResponse = await request("/api/auth/logout", {
    method: "POST",
    headers: { cookie: `jwt=${originalCookie}` },
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie"), /Expires=/);

  const logoutAllResponse = await request("/api/auth/logout-all", {
    method: "POST",
    token: loginBody.accessToken,
  });
  assert.equal(logoutAllResponse.status, 200);
  assert.match(logoutAllResponse.headers.get("set-cookie"), /Expires=/);

  const invalidGroupPath = await request("/api/groups/not-a-uuid", { token: payerToken });
  assert.equal(invalidGroupPath.status, 400);
  assert.ok((await invalidGroupPath.json()).details.some((issue) => issue.field === "params.groupId"));

  const unauthenticatedGroupRequest = await request(`/api/groups/${groupId}`);
  assert.equal(unauthenticatedGroupRequest.status, 401);

  const memberInvite = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: payerToken,
    body: { email: invitee.email },
  });
  assert.equal(memberInvite.status, 403);

  const adminInvite = await request(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: adminToken,
    body: { email: invitee.email },
  });
  assert.equal(adminInvite.status, 201);

  const expensePayload = {
    description: "Shared cost",
    amount: 100,
    category: "FOOD",
    splitType: "EXACT",
    paidBy: payee.id,
    splits: [{ userId: payer.id, value: 100 }],
  };
  const invalidExpense = await request(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    token: payerToken,
    body: { ...expensePayload, amount: -1 },
  });
  assert.equal(invalidExpense.status, 400);

  const createExpenseResponse = await request(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    token: payerToken,
    body: expensePayload,
  });
  assert.equal(createExpenseResponse.status, 201);
  const createdExpense = (await createExpenseResponse.json()).expense;
  const expenseId = createdExpense.id;

  const updateExpenseResponse = await request(
    `/api/groups/${groupId}/expenses/${expenseId}`,
    {
      method: "PUT",
      token: adminToken,
      body: { ...expensePayload, description: "Updated shared cost" },
    },
  );
  assert.equal(updateExpenseResponse.status, 200);

  const initialBalanceResponse = await request(`/api/groups/${groupId}/balances`, {
    token: payerToken,
  });
  const initialBalance = await initialBalanceResponse.json();
  assert.equal(initialBalance.summary.find((row) => row.userId === payer.id).netBalance, -100);
  assert.equal(initialBalance.summary.find((row) => row.userId === payee.id).netBalance, 100);
  assert.deepEqual(initialBalance.transactions[0], {
    from: payer.id,
    fromName: payer.name,
    to: payee.id,
    toName: payee.name,
    amount: 100,
  });

  const memberRemoval = await request(
    `/api/groups/${groupId}/members/${payer.id}`,
    { method: "DELETE", token: adminToken },
  );
  assert.equal(memberRemoval.status, 400);

  const overSettlement = await request(`/api/groups/${groupId}/settlements`, {
    method: "POST",
    token: payerToken,
    body: { payeeId: payee.id, amount: 100.01 },
  });
  assert.equal(overSettlement.status, 400);

  const settlementResponse = await request(`/api/groups/${groupId}/settlements`, {
    method: "POST",
    token: payerToken,
    body: { payeeId: payee.id, amount: 100 },
  });
  assert.equal(settlementResponse.status, 201);
  const settledBalanceResponse = await request(`/api/groups/${groupId}/balances`, {
    token: payerToken,
  });
  const settledBalance = await settledBalanceResponse.json();
  assert.ok(settledBalance.summary.every((row) => row.netBalance === 0));

  const settlementsResponse = await request(`/api/groups/${groupId}/settlements`, {
    token: payerToken,
  });
  const settlementsBody = await settlementsResponse.json();
  assert.equal(settlementsBody.settlements[0].payer.id, payer.id);
  assert.equal(settlementsBody.settlements[0].payee.id, payee.id);

  const replaySettlement = await request(`/api/groups/${groupId}/settlements`, {
    method: "POST",
    token: payerToken,
    body: { payeeId: payee.id, amount: 0.01 },
  });
  assert.equal(replaySettlement.status, 400);

  const settlementId = settlementsBody.settlements[0].id;
  const archiveSettlement = await request(
    `/api/groups/${groupId}/settlements/${settlementId}`,
    { method: "DELETE", token: payerToken },
  );
  assert.equal(archiveSettlement.status, 200);
  const settlementRecord = await prisma.expenses.findUnique({ where: { id: settlementId } });
  assert.ok(settlementRecord.deletedAt);

  const debtRestored = await request(`/api/groups/${groupId}/balances`, {
    token: payerToken,
  });
  assert.equal((await debtRestored.json()).transactions[0].amount, 100);
  const archivedExpenseResponse = await request(
    `/api/groups/${groupId}/expenses/${expenseId}`,
    { method: "DELETE", token: adminToken },
  );
  assert.equal(archivedExpenseResponse.status, 200);
  const expenseRecord = await prisma.expenses.findUnique({ where: { id: expenseId } });
  assert.ok(expenseRecord.deletedAt);

  const archivedGroupResponse = await request(`/api/groups/${groupId}`, {
    method: "DELETE",
    token: adminToken,
  });
  assert.equal(archivedGroupResponse.status, 200);
  const groupRecord = await prisma.groups.findUnique({ where: { id: groupId } });
  assert.ok(groupRecord.deletedAt);

  const liveCheck = await request("/api/health");
  assert.equal(liveCheck.status, 200);
  const readyCheck = await request("/api/ready");
  assert.equal(readyCheck.status, 200);

  const allowedCors = await request("/api/health", {
    headers: { origin: "http://localhost:5173" },
  });
  assert.equal(allowedCors.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const deniedCors = await request("/api/health", {
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(deniedCors.headers.get("access-control-allow-origin"), null);
  assert.ok(loginBody.accessToken);
  assert.ok(rotatedCookie);
});
