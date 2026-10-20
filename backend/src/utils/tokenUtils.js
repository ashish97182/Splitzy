import crypto from "node:crypto";

export const hashRefreshToken = (token) => {
return crypto.createHash("sha256").update(token).digest("hex");
};

export const refreshCookieOptions = {
httpOnly: true,
secure: process.env.NODE_ENV === "production"
  || process.env.COOKIE_SAME_SITE?.toLowerCase() === "none",
sameSite: process.env.COOKIE_SAME_SITE?.toLowerCase() || "strict",
path: "/api/auth",
};

export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

export const clearRefreshCookie = (res) => {
res.clearCookie("jwt", refreshCookieOptions);
};
