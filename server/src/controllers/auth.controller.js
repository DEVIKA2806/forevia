const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { COOKIE_NAME, signToken, getCookieOptions } = require("../utils/token");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// Same limit the profile page enforces when the name is edited later.
const MAX_NAME_LENGTH = 80;
// The practical maximum for an email address. Also keeps the value within
// what the database's unique index on email can hold.
const MAX_EMAIL_LENGTH = 254;

// A value from the request body as trimmed text, or "" if it isn't a
// string at all. Without this, a number, array or object (or a missing
// body) would crash on .trim() and surface as a 500 instead of a clear 4xx.
function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Logs what kind of failure happened, never the error object itself:
// database errors can carry the values of the query (emails, hashes).
function describe(error) {
  return `${(error && error.name) || "Error"}${error && error.code ? ` ${error.code}` : ""}`;
}

// Cost factor for bcrypt's hashing algorithm — each increment roughly
// doubles the time it takes to hash (and to brute-force). 12 is a common,
// reasonable default for a normal web app in 2026: slow enough to make
// brute-forcing leaked hashes impractical, fast enough not to noticeably
// slow down signup/login.
const BCRYPT_COST_FACTOR = 12;

// Strips passwordHash (and anything else internal) before a user object
// ever reaches the frontend. Every response in this file goes through
// this — never send the raw Prisma user record back to the client.
function toSafeUser(user) {
  return { id: user.id, name: user.fullName, email: user.email };
}

async function signup(req, res) {
  try {
    const body = req.body || {};
    const name = textOf(body.name);
    const email = textOf(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    // Server-side validation — the frontend also validates, but that's only
    // a UX convenience. A request can always bypass the frontend entirely
    // (curl, Postman, a modified client), so the backend must never trust
    // it and has to independently re-check everything here.
    if (!name) {
      return res.status(400).json({ message: "Full name is required." });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        message: `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      });
    }
    if (!email || !EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    // bcrypt.hash generates its own random salt internally and folds it
    // into the output string, so we don't manage salts ourselves — the
    // resulting passwordHash is everything needed to verify a password
    // later with bcrypt.compare.
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

    const user = await prisma.user.create({
      data: { fullName: name, email, passwordHash },
    });

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(201).json({ user: toSafeUser(user) });
  } catch (error) {
    console.error(`Signup failed (${describe(error)}).`);
    return res
      .status(500)
      .json({ message: "Unable to create your account. Please try again." });
  }
}

async function login(req, res) {
  try {
    const body = req.body || {};
    const email = textOf(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Deliberately generic error for both "no such user" and "wrong
    // password" — a different message for each would let an attacker
    // discover which emails have accounts (user enumeration).
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({ user: toSafeUser(user) });
  } catch (error) {
    console.error(`Login failed (${describe(error)}).`);
    return res
      .status(500)
      .json({ message: "Unable to sign in. Please try again." });
  }
}

async function logout(req, res) {
  // clearCookie must be called with the same path/sameSite/secure
  // attributes the cookie was set with, or some browsers won't actually
  // remove it — reuse the same option builder rather than duplicating
  // those values. maxAge doesn't matter for clearing, so it's dropped.
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(COOKIE_NAME, clearOptions);

  // Always succeeds, even if the user was never logged in — logging out
  // of a session you don't have isn't an error condition.
  return res.status(200).json({ message: "Logged out successfully" });
}

async function me(req, res) {
  // requireAuth middleware already verified the JWT and attached the
  // authenticated user to req.user before this handler runs.
  return res.status(200).json({ user: toSafeUser(req.user) });
}

module.exports = { signup, login, logout, me };
