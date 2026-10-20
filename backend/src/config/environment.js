import dotenv from "dotenv";

dotenv.config();

const PLACEHOLDER_SECRET_PATTERN = /(?:replace_with|change_me|example|your_secret)/i;

export function validateRuntimeConfiguration(env = process.env) {
  const errors = [];

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = env[key];
    if (!value || value.length < 32 || PLACEHOLDER_SECRET_PATTERN.test(value)) {
      errors.push(`${key} must be a non-placeholder secret of at least 32 characters.`);
    }
  }

  if (
    env.JWT_SECRET &&
    env.JWT_REFRESH_SECRET &&
    env.JWT_SECRET === env.JWT_REFRESH_SECRET
  ) {
    errors.push("JWT_SECRET and JWT_REFRESH_SECRET must be different.");
  }

  if (env.PORT && (!/^\d+$/.test(env.PORT) || Number(env.PORT) < 1 || Number(env.PORT) > 65535)) {
    errors.push("PORT must be an integer between 1 and 65535.");
  }

  if (env.TRUST_PROXY && (!/^\d+$/.test(env.TRUST_PROXY) || Number(env.TRUST_PROXY) > 10)) {
    errors.push("TRUST_PROXY must be a hop count between 0 and 10.");
  }

  if (env.COOKIE_SAME_SITE && !["strict", "lax", "none"].includes(env.COOKIE_SAME_SITE.toLowerCase())) {
    errors.push("COOKIE_SAME_SITE must be strict, lax, or none.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid backend configuration:\n- ${errors.join("\n- ")}`);
  }
}

export function getAllowedOrigins(env = process.env) {
  return [...new Set(
    [env.CLIENT_URL, ...(env.CLIENT_ORIGINS ?? "").split(",")]
      .map((origin) => origin?.trim())
      .filter(Boolean)
      .map((origin) => {
        let parsed;
        try {
          parsed = new URL(origin);
        } catch {
          throw new Error(`Invalid CLIENT_URL/CLIENT_ORIGINS entry: ${origin}`);
        }

        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error(`Client origin must use HTTP or HTTPS: ${origin}`);
        }
        return parsed.origin;
      }),
  )];
}
