import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedOrigins,
  validateRuntimeConfiguration,
} from "../../src/config/environment.js";

test("runtime configuration accepts strong independent secrets and bounded settings", () => {
  assert.doesNotThrow(() => validateRuntimeConfiguration({
    DATABASE_URL: "postgresql://localhost/splitzy",
    JWT_SECRET: "access-key-that-is-long-enough-123456",
    JWT_REFRESH_SECRET: "different-refresh-key-long-enough-123456",
    PORT: "5000",
    TRUST_PROXY: "1",
    COOKIE_SAME_SITE: "strict",
  }));
});

test("runtime configuration rejects missing, placeholder, reused, and malformed secrets", () => {
  assert.throws(() => validateRuntimeConfiguration({
    DATABASE_URL: "postgresql://localhost/splitzy",
    JWT_SECRET: "replace_with_a_long_random_access_token_secret",
    JWT_REFRESH_SECRET: "replace_with_a_long_random_access_token_secret",
  }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfiguration({}), /DATABASE_URL/);
});

test("origin configuration normalizes and deduplicates exact web origins", () => {
  assert.deepEqual(
    getAllowedOrigins({
      CLIENT_URL: "https://app.example/path",
      CLIENT_ORIGINS: "https://app.example, http://localhost:5173",
    }),
    ["https://app.example", "http://localhost:5173"],
  );
  assert.throws(
    () => getAllowedOrigins({ CLIENT_URL: "javascript:alert(1)" }),
    /HTTP or HTTPS/,
  );
});

test("origin configuration accepts the deployed frontend origin", () => {
  assert.deepEqual(
    getAllowedOrigins({
      FRONTEND_ORIGIN: "https://dostidue-8obm6gdw1-nishantmedwan.vercel.app",
    }),
    ["https://dostidue-8obm6gdw1-nishantmedwan.vercel.app"],
  );
});
