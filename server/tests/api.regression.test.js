// Phase 13 API regression tests. Run with:  node --test tests/api.regression.test.js
//
// Runs the REAL Express app, the REAL auth middleware, REAL bcrypt and REAL
// JWTs. Only the database is replaced, by a small in-memory stand-in for
// Prisma. Each section sends malformed, hostile or boundary input and checks
// the API answers with a clean 4xx (never a 500), keeps users' data apart,
// and never prints or returns secrets.
//
// It does not exercise real Postgres.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "regression-test-secret";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d";
process.env.CLIENT_URL = "http://127.0.0.1:4173";
delete process.env.AI_API_KEY;
process.env.AI_PROVIDER = "gemini";

// ------------------------------------------------------------ fake database
const users = [];
const healthProfiles = new Map();
const wealthProfiles = new Map();
const copy = (o) => (o ? { ...o } : null);

const fakePrisma = {
  user: {
    findUnique: async ({ where }) =>
      copy(users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email))),
    create: async ({ data }) => {
      const user = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      users.push(user);
      return copy(user);
    },
    update: async ({ where, data }) => {
      const user = users.find((u) => u.id === where.id);
      if (!user) throw Object.assign(new Error("not found"), { code: "P2025" });
      Object.assign(user, data);
      return copy(user);
    },
  },
  healthProfile: {
    findUnique: async ({ where }) => copy(healthProfiles.get(where.userId)),
    upsert: async ({ where, create, update }) => {
      const current = healthProfiles.get(where.userId);
      const next = current ? { ...current, ...update } : { id: crypto.randomUUID(), ...create };
      healthProfiles.set(where.userId, next);
      return copy(next);
    },
  },
  wealthProfile: {
    findUnique: async ({ where }) => copy(wealthProfiles.get(where.userId)),
    upsert: async ({ where, create, update }) => {
      const current = wealthProfiles.get(where.userId);
      const next = current ? { ...current, ...update } : { id: crypto.randomUUID(), ...create };
      wealthProfiles.set(where.userId, next);
      return copy(next);
    },
  },
  goal: { findMany: async () => [], count: async () => 0 },
};

const prismaPath = require.resolve("../src/config/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const { signToken } = require("../src/utils/token");
const app = require(path.join("..", "src", "app"));

// Collect everything the server prints, so the last test can check it.
const logged = [];
const originalError = console.error;
console.error = (...args) => {
  logged.push(
    args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
  );
};

// ------------------------------------------------------------------ helpers
let server;
let base;
const realFetch = global.fetch;

test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => {
  global.fetch = realFetch;
  console.error = originalError;
  server.close();
});

async function call(method, route, { headers = {}, body, raw, noType } = {}) {
  const response = await realFetch(base + route, {
    method,
    headers: { ...(noType ? {} : { "content-type": "application/json" }), ...headers },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text, headers: response.headers, setCookie: response.headers.getSetCookie() };
}

const cookieOf = (r) => {
  const c = r.setCookie.find((s) => s.startsWith("forevia_token="));
  return c ? c.split(";")[0] : null;
};
const byEmail = (email) => users.find((u) => u.email === email);
const PASSWORD = "Sup3r-Secret-Pw!";

// Each section is one test; every failed check in it is reported together.
function section(title, fn) {
  test(title, async () => {
    const failures = [];
    const check = (name, condition, detail = "") => {
      if (!condition) failures.push(name + (detail ? `  -> ${detail}` : ""));
    };
    await fn(check);
    assert.deepEqual(failures, []);
  });
}

const validHealth = {
  age: 30, gender: "female", heightCm: 165, weightKg: 60, activityLevel: "moderate",
  sleepHours: 7, smokingStatus: "never", alcoholUse: "never", conditions: "none", healthGoals: "fitness",
};
const validWealth = {
  monthlyIncome: 100000, monthlyExpenses: 60000, currentSavings: 50000, currentInvestments: 200000,
  existingDebt: 0, monthlyInvestment: 10000, financialGoal: "emergency_fund", targetAmount: "", targetYears: "",
};

let ashaCookie;

// ============================================================ authentication

section("signup: wrong-typed, missing and oversized input is a clear 4xx", async (check) => {
  let r = await call("POST", "/api/auth/signup", { noType: true });
  check("no body / no content-type is not a 500", r.status >= 400 && r.status < 500, `status ${r.status}`);

  const bad = [
    ["name is a number", { name: 123, email: "a@b.co", password: PASSWORD }],
    ["name is an array", { name: ["x"], email: "a@b.co", password: PASSWORD }],
    ["name is an object", { name: { a: 1 }, email: "a@b.co", password: PASSWORD }],
    ["email is an object", { name: "A", email: { a: 1 }, password: PASSWORD }],
    ["password is a number", { name: "A", email: "a@b.co", password: 12345678 }],
    ["name is only spaces", { name: "   ", email: "a@b.co", password: PASSWORD }],
    ["password is too short", { name: "A", email: "a@b.co", password: "short" }],
    ["email is not an email", { name: "A", email: "nope", password: PASSWORD }],
    ["name is 10,000 characters (profile edit allows 80)", { name: "N".repeat(10000), email: "long@name.co", password: PASSWORD }],
    ["email is 3,000 characters", { name: "A", email: `${"a".repeat(3000)}@example.com`, password: PASSWORD }],
  ];
  for (const [label, body] of bad) {
    r = await call("POST", "/api/auth/signup", { body });
    check(`rejects: ${label}`, r.status === 400, `status ${r.status}`);
  }
  check("none of the rejected signups created an account", users.length === 0, `${users.length} users`);
});

section("signup: a valid account, stored safely", async (check) => {
  let r = await call("POST", "/api/auth/signup", { body: { name: "Asha A", email: "  Asha@Example.COM ", password: PASSWORD } });
  check("valid signup -> 201", r.status === 201, `status ${r.status}`);
  ashaCookie = cookieOf(r);
  const cookie = r.setCookie[0] || "";
  check("session cookie is HttpOnly, SameSite=Lax, Path=/", /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie) && /Path=\//i.test(cookie), cookie);
  check("response carries no password or hash", !/passwordHash|\$2[aby]\$|Sup3r/.test(r.text), r.text);
  const stored = byEmail("asha@example.com");
  check("email is stored trimmed and lower-cased", !!stored);
  check("password is stored as a bcrypt hash, not as typed", !!stored && /^\$2[aby]\$12\$/.test(stored.passwordHash));
  r = await call("POST", "/api/auth/signup", { body: { name: "Dup", email: "ASHA@example.com", password: PASSWORD } });
  check("same email in another case -> 409", r.status === 409, `status ${r.status}`);
});

section("login, logout and session tokens", async (check) => {
  let r = await call("POST", "/api/auth/login", { noType: true });
  check("login with no body is a 4xx, not a 500", r.status >= 400 && r.status < 500, `status ${r.status}`);
  r = await call("POST", "/api/auth/login", { body: { email: "asha@example.com", password: 12345678 } });
  check("numeric password is a 4xx", r.status >= 400 && r.status < 500, `status ${r.status}`);
  r = await call("POST", "/api/auth/login", { body: { email: { $ne: "" }, password: PASSWORD } });
  check("object email (injection-style) is a 4xx", r.status >= 400 && r.status < 500, `status ${r.status}`);

  const wrong = await call("POST", "/api/auth/login", { body: { email: "asha@example.com", password: "wrong-password" } });
  const unknown = await call("POST", "/api/auth/login", { body: { email: "nobody@example.com", password: "wrong-password" } });
  check("wrong password and unknown email give the same 401 and message", wrong.status === 401 && unknown.status === 401 && wrong.text === unknown.text);

  r = await call("POST", "/api/auth/login", { body: { email: "ASHA@example.com", password: PASSWORD } });
  check("login works (email is case-insensitive)", r.status === 200 && !!cookieOf(r));
  ashaCookie = cookieOf(r);
  r = await call("GET", "/api/auth/me", { headers: { cookie: ashaCookie } });
  check("/me returns the user without the hash", r.status === 200 && r.json.user.email === "asha@example.com" && !/passwordHash/.test(r.text));

  r = await call("POST", "/api/auth/logout", {});
  check("logout expires the cookie", r.status === 200 && r.setCookie.some((s) => /forevia_token=;/.test(s) && /(Expires=Thu, 01 Jan 1970|Max-Age=0)/i.test(s)), JSON.stringify(r.setCookie));

  const ashaId = byEmail("asha@example.com").id;
  const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ userId: ashaId })).toString("base64url")}.`;
  const badTokens = [
    ["garbage", "garbage"],
    ["alg:none (unsigned)", unsigned],
    ["signed with the wrong secret", jwt.sign({ userId: ashaId }, "some-other-secret")],
    ["expired", jwt.sign({ userId: ashaId }, process.env.JWT_SECRET, { expiresIn: -10 })],
    ["valid signature but no userId", jwt.sign({}, process.env.JWT_SECRET)],
    ["for a user that no longer exists", signToken("ghost-user")],
  ];
  for (const [label, token] of badTokens) {
    r = await call("GET", "/api/auth/me", { headers: { cookie: `forevia_token=${token}` } });
    check(`/me rejects a token that is ${label}`, r.status === 401, `status ${r.status}`);
  }
});

section("every protected endpoint rejects anonymous requests", async (check) => {
  const routes = [
    ["GET", "/api/auth/me"], ["GET", "/api/user/profile"], ["PATCH", "/api/user/profile"],
    ["GET", "/api/health-profile"], ["PUT", "/api/health-profile"],
    ["GET", "/api/wealth-profile"], ["PUT", "/api/wealth-profile"],
    ["GET", "/api/calculations/summary"], ["POST", "/api/calculations/simulate"], ["GET", "/api/calculations/projections"],
    ["POST", "/api/insights"],
    ["GET", "/api/goals"], ["POST", "/api/goals"], ["PUT", "/api/goals/x"], ["DELETE", "/api/goals/x"],
  ];
  const open = [];
  for (const [method, route] of routes) {
    const r = await call(method, route, { body: method === "GET" || method === "DELETE" ? undefined : {} });
    if (r.status !== 401) open.push(`${method} ${route} = ${r.status}`);
  }
  check(`all ${routes.length} return 401 without a session`, open.length === 0, open.join(", "));
  const r = await call("GET", "/api/health-check");
  check("the public health-check still answers", r.status === 200);
});

// ================================================================== profiles

section("user profile edits", async (check) => {
  const headers = { cookie: ashaCookie };
  const bad = [
    ["name is a number", { name: 5 }], ["name is an array", { name: ["x"] }],
    ["name is empty", { name: "" }], ["name is 81 characters", { name: "x".repeat(81) }],
  ];
  for (const [label, body] of bad) {
    const r = await call("PATCH", "/api/user/profile", { headers, body });
    check(`rejects: ${label}`, r.status === 400, `status ${r.status}`);
  }
  let r = await call("PATCH", "/api/user/profile", { headers, noType: true });
  check("no body is a 4xx, not a 500", r.status >= 400 && r.status < 500, `status ${r.status}`);

  r = await call("PATCH", "/api/user/profile", {
    headers, body: { name: "  Asha Renamed ", email: "attacker@evil.com", id: "x", passwordHash: "x" },
  });
  const asha = byEmail("asha@example.com");
  check("renames, and ignores email / id / passwordHash in the body",
    r.status === 200 && r.json.user.name === "Asha Renamed" && !!asha && asha.passwordHash.startsWith("$2"));
});

section("health and wealth profile validation", async (check) => {
  const headers = { cookie: ashaCookie };
  let r = await call("PUT", "/api/health-profile", { headers, body: validHealth });
  check("valid health profile saves", r.status === 200, r.text.slice(0, 100));

  const badHealth = [
    ["age is text", { age: "abc" }], ["age is an array", { age: [30] }], ["age is a boolean", { age: true }],
    ["age is 12 (below 13)", { age: 12 }], ["age is not a whole number", { age: 30.5 }],
    ["height is 1e308", { heightCm: 1e308 }], ["weight is negative", { weightKg: -5 }], ["sleep is 25", { sleepHours: 25 }],
    ["gender is not an option", { gender: "x" }], ["activity level is an object", { activityLevel: { a: 1 } }],
    ["conditions is an object", { conditions: { a: 1 } }], ["conditions is 100,000 characters", { conditions: "x".repeat(100000) }],
  ];
  for (const [label, over] of badHealth) {
    r = await call("PUT", "/api/health-profile", { headers, body: { ...validHealth, ...over } });
    check(`health rejects: ${label}`, r.status === 400, `status ${r.status}`);
  }
  r = await call("PUT", "/api/health-profile", { headers, noType: true });
  check("health PUT with no body is 400, not 500", r.status === 400, `status ${r.status}`);

  r = await call("PUT", "/api/wealth-profile", { headers, body: validWealth });
  check("valid wealth profile saves", r.status === 200, r.text.slice(0, 100));
  const badWealth = [
    ["income is text", { monthlyIncome: "lots" }], ["income is an array", { monthlyIncome: [5] }],
    ["income is an empty array (would have become 0)", { monthlyIncome: [] }], ["income is a boolean", { monthlyIncome: true }],
    ["expenses are negative", { monthlyExpenses: -1 }], ["savings are 1e12", { currentSavings: 1e12 }],
    ["debt is the text 'Infinity'", { existingDebt: "Infinity" }], ["goal is not an option", { financialGoal: "get-rich" }],
    ["targetYears is 0", { targetYears: 0 }],
  ];
  for (const [label, over] of badWealth) {
    r = await call("PUT", "/api/wealth-profile", { headers, body: { ...validWealth, ...over } });
    check(`wealth rejects: ${label}`, r.status === 400, `status ${r.status}`);
  }
});

section("users only ever see and change their own profiles", async (check) => {
  const ashaId = byEmail("asha@example.com").id;
  let r = await call("POST", "/api/auth/signup", { body: { name: "Ben", email: "ben@example.com", password: PASSWORD } });
  const ben = { cookie: cookieOf(r) };
  const benId = byEmail("ben@example.com").id;

  r = await call("GET", "/api/health-profile", { headers: ben });
  check("Ben has no health profile yet (Asha's is not shown)", r.status === 200 && r.json.profile === null, r.text.slice(0, 100));
  r = await call("GET", "/api/wealth-profile", { headers: ben });
  check("Ben's wealth profile holds none of Asha's figures", !/100000|200000/.test(r.text), r.text.slice(0, 100));

  await call("PUT", "/api/health-profile", { headers: ben, body: { ...validHealth, age: 44, userId: ashaId } });
  check("Ben saving (with Asha's id in the body) leaves Asha's age at 30",
    healthProfiles.get(ashaId).age === 30 && healthProfiles.get(benId).age === 44);
  r = await call("GET", `/api/health-profile?userId=${ashaId}`, { headers: ben });
  check("?userId=<Asha> in the URL is ignored: Ben still gets his own",
    r.status === 200 && r.json.profile.userId === benId && r.json.profile.age === 44, r.text.slice(0, 100));
  r = await call("GET", "/api/calculations/summary", { headers: ben });
  check("Ben's calculations use only Ben's data", r.status === 200 && !/100000/.test(r.text), r.text.slice(0, 100));
});

// ============================================================== calculations

section("calculation and simulator endpoints cope with hostile input", async (check) => {
  const headers = { cookie: ashaCookie };
  let r = await call("GET", "/api/calculations/summary", { headers });
  check("summary returns the real figures", r.status === 200 && r.json.wealth && r.json.wealth.monthlySurplus === 40000);

  const cases = [
    ["no body", undefined, true], ["empty object", {}], ["array body", []], ["years 0", { years: 0 }],
    ["years 51", { years: 51 }], ["years 'abc'", { years: "abc" }], ["years is an array", { years: [5] }],
    ["years 2.5", { years: 2.5 }], ["negative expenses override", { years: 5, wealth: { monthlyExpenses: -1 } }],
    ["1e300 income override", { years: 5, wealth: { monthlyIncome: 1e300 } }], ["wealth override is text", { years: 5, wealth: "x" }],
    ["weight override is an object", { years: 5, health: { weightKg: { a: 1 } } }],
  ];
  for (const [label, body, noType] of cases) {
    r = await call("POST", "/api/calculations/simulate", { headers, body, noType });
    check(`simulate handles: ${label} (no 5xx, no NaN)`, r.status < 500 && !/NaN|Infinity/.test(r.text), `status ${r.status} ${r.text.slice(0, 80)}`);
  }
  r = await call("POST", "/api/calculations/simulate", { headers, body: { years: 5, wealth: { monthlyExpenses: 70000 } } });
  check("a valid simulation works", r.status === 200);
});

// =================================================================== AI guide

section("AI guide: Gemini failures and privacy", async (check) => {
  const signUp = async (name, email) => {
    const r = await call("POST", "/api/auth/signup", { body: { name, email, password: PASSWORD } });
    const user = byEmail(email);
    healthProfiles.set(user.id, { ...healthProfiles.get(byEmail("asha@example.com").id), userId: user.id });
    wealthProfiles.set(user.id, { ...wealthProfiles.get(byEmail("asha@example.com").id), userId: user.id });
    return { cookie: cookieOf(r), id: user.id };
  };

  // not configured
  let r = await call("POST", "/api/insights", { headers: { cookie: ashaCookie } });
  check("no API key -> a clean 503 that mentions no internals", r.status === 503 && !!r.json.message && !/AI_API_KEY|env|undefined/i.test(r.text), `${r.status} ${r.text.slice(0, 100)}`);

  process.env.AI_API_KEY = "SECRET-GEMINI-KEY-12345";
  let sent = [];
  const stubGemini = (impl) => {
    global.fetch = async (url, options) => {
      if (String(url).includes("generativelanguage")) {
        sent.push({ url: String(url), options });
        return impl();
      }
      return realFetch(url, options);
    };
  };
  const reply = (status, text = "") => ({ ok: false, status, text: async () => text, json: async () => ({}) });
  const timeout = () => Object.assign(new Error("t"), { name: "TimeoutError" });
  const failures = [
    ["Gemini 503 overloaded", () => reply(503)],
    ["Gemini 429 quota", () => reply(429)],
    ["Gemini 400 invalid key", () => reply(400, '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}')],
    ["network failure carrying the key in its message", () => { throw new TypeError("fetch failed: SECRET-GEMINI-KEY-12345"); }],
    ["a reply that isn't JSON", () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "not json" }] }, finishReason: "STOP" }] }) })],
    ["a timeout", () => { throw timeout(); }],
  ];
  for (const [label, impl] of failures) {
    const who = await signUp(`T ${label}`, `${crypto.randomUUID()}@example.com`);
    stubGemini(impl);
    r = await call("POST", "/api/insights", { headers: { cookie: who.cookie } });
    check(`handled gracefully: ${label}`,
      r.status >= 500 && !!r.json && typeof r.json.message === "string" && !/SECRET|AIza|candidates|fetch failed/i.test(r.text),
      `${r.status} ${r.text.slice(0, 100)}`);
  }

  // success, privacy, rate limit
  const good = {
    keyObservations: ["Savings rate is 40%.", "Sleep is 7 hours.", "Expenses are 60%."],
    financialInsights: ["Consider an emergency fund."], healthInsights: ["BMI is typical."],
    nextSteps: ["Review expenses.", "See a doctor for advice.", "Keep going."],
  };
  const person = await signUp("Private Person", "private.person@example.com");
  healthProfiles.set(person.id, { ...healthProfiles.get(person.id), conditions: "SECRET-CONDITION-TEXT", healthGoals: "SECRET-GOAL-TEXT" });
  sent = [];
  stubGemini(() => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] }, finishReason: "STOP" }] }) }));
  r = await call("POST", "/api/insights", { headers: { cookie: person.cookie } });
  check("success returns structured insights", r.status === 200 && r.json.insights && Array.isArray(r.json.insights.nextSteps), `${r.status} ${r.text.slice(0, 100)}`);

  const prompt = JSON.stringify(sent[0] && JSON.parse(sent[0].options.body));
  check("the prompt sent to Gemini has no name, email or free-text profile fields", !/Private Person|private\.person|SECRET-CONDITION|SECRET-GOAL|asha/i.test(prompt), prompt.slice(0, 120));
  check("the API key travels only in the x-goog-api-key header",
    sent[0].options.headers["x-goog-api-key"] === "SECRET-GEMINI-KEY-12345" && !sent[0].url.includes("SECRET") && !prompt.includes("SECRET-GEMINI"));
  check("the API key is never in a response to the browser", !r.text.includes("SECRET-GEMINI-KEY"));

  let last;
  for (let i = 0; i < 6; i += 1) last = await call("POST", "/api/insights", { headers: { cookie: person.cookie } });
  check("the per-user rate limit engages with a retry hint", last.status === 429 && /try again/i.test(last.text), `${last.status} ${last.text.slice(0, 100)}`);
  global.fetch = realFetch;
});

// ======================================================= http-level behaviour

section("HTTP-level robustness and headers", async (check) => {
  let r = await call("POST", "/api/auth/login", { raw: "{not json" });
  check("malformed JSON -> a JSON 400, not an HTML page", r.status === 400 && /json/i.test(r.headers.get("content-type") || ""), `${r.status} ${r.headers.get("content-type")}`);
  check("...and it shows no stack trace or file path", !/\sat\s.+\(.*\.js|node_modules|\/home\//.test(r.text), r.text.slice(0, 150));

  r = await call("POST", "/api/auth/login", { raw: JSON.stringify({ email: "a@b.co", password: "x".repeat(300000) }) });
  check("a 300 KB body -> a JSON 413", r.status === 413 && /json/i.test(r.headers.get("content-type") || ""), `${r.status} ${r.headers.get("content-type")}`);

  r = await call("GET", "/api/does-not-exist");
  check("an unknown route -> a JSON 404", r.status === 404 && !!r.json);
  r = await call("GET", "/api/health-check");
  check("X-Powered-By is not advertised", !r.headers.get("x-powered-by"), `header: ${r.headers.get("x-powered-by")}`);

  let cors = await realFetch(`${base}/api/health-check`, { headers: { origin: "http://127.0.0.1:4173" } });
  check("CORS allows the configured client origin, with credentials",
    cors.headers.get("access-control-allow-origin") === "http://127.0.0.1:4173" && cors.headers.get("access-control-allow-credentials") === "true");
  cors = await realFetch(`${base}/api/health-check`, { headers: { origin: "http://evil.example" } });
  check("CORS does not echo an unknown origin", cors.headers.get("access-control-allow-origin") !== "http://evil.example");
});

// Keep this last: it inspects everything the server logged in the sections above.
section("log hygiene: nothing sensitive is ever printed", async (check) => {
  const everything = logged.join("\n");
  const leak = everything.match(/Sup3r-Secret|\$2[aby]\$[^\s"]{0,10}|SECRET-GEMINI[^\s"]*|SECRET-CONDITION[^\s"]*|forevia_token=|private\.person[^\s"]*|asha@example[^\s"]*/gi);
  check("no password, hash, token, API key, email or profile text in the logs", !leak, `leaked: ${(leak || []).slice(0, 4).join(", ")}`);
  check("no stack traces from request handling", !/\n\s+at /.test(everything), (everything.match(/.{0,60}\n\s+at .{0,80}/) || [""])[0].replace(/\n/g, " | "));
});
