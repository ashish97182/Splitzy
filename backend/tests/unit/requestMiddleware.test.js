import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validateRequest } from "../../src/middleware/validateRequest.js";
import { verifyOrigin } from "../../src/middleware/verifyOrigin.js";

test("request validation returns field-level errors and does not call next", () => {
  let responseStatus;
  let responseBody;
  let nextCalled = false;
  const middleware = validateRequest({
    body: z.object({ name: z.string().min(1) }).strict(),
  });

  middleware(
    { body: { unexpected: true } },
    {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    },
    () => { nextCalled = true; },
  );

  assert.equal(responseStatus, 400);
  assert.equal(responseBody.error, "Validation failed.");
  assert.ok(responseBody.details.length > 0);
  assert.equal(nextCalled, false);
});

test("origin middleware rejects untrusted state-changing requests", () => {
  let responseStatus;
  let nextCalled = false;
  const middleware = verifyOrigin(["https://app.example"]);

  middleware(
    { method: "POST", get: () => "https://evil.example" },
    {
      status(status) {
        responseStatus = status;
        return this;
      },
      json() {
        return this;
      },
    },
    () => { nextCalled = true; },
  );

  assert.equal(responseStatus, 403);
  assert.equal(nextCalled, false);
});
