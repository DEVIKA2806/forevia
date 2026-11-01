const jwt = require("jsonwebtoken");

// The name of the cookie that holds the JWT. Not secret — just an
// identifier, like a variable name.
const COOKIE_NAME = "forevia_token";

/**
 * Creates a JWT for a given user. The payload only contains userId — never
 * put passwords, emails, or anything sensitive in a JWT, because a JWT is
 * signed (tamper-proof) but NOT encrypted (readable by anyone who has it,
 * e.g. by pasting it into jwt.io).
 */
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Verifies a JWT's signature and expiry. Throws if the token is invalid,
 * tampered with, or expired — callers (the auth middleware) are expected
 * to catch that and respond 401.
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Cookie options are environment-aware because the frontend and backend
 * may end up on different domains in production (e.g. a Vercel frontend
 * calling a Render/Railway backend), which is a cross-site request from
 * the browser's point of view:
 *  - In production: `secure: true` (cookie only sent over HTTPS) and
 *    `sameSite: "none"` (required by browsers for the cookie to be sent
 *    on cross-site requests at all — sameSite=none only works when
 *    secure=true).
 *  - In local development: both frontend and backend run on `localhost`
 *    over plain HTTP, so `secure: true` would cause browsers to silently
 *    drop the cookie. `sameSite: "lax"` is enough locally because
 *    "site" is based on domain, not port — localhost:5173 and
 *    localhost:5000 count as the same site.
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true, // never readable by client-side JavaScript
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
}

module.exports = { COOKIE_NAME, signToken, verifyToken, getCookieOptions };
