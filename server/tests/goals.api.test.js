// Phase 12 API tests. Run with:  node --test tests/goals.api.test.js
//
// Runs the REAL Express app, the REAL auth middleware and REAL JWTs. Only
// the database is replaced, by a small in-memory stand-in for Prisma. It is
// deliberately strict: it throws if any goal query isn't scoped to a user,
// so a forgotten ownership filter fails these tests instead of passing.
// It does not exercise real Postgres; see the README steps for that.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d";

// ---------------------------------------------------------------- fake DB
const users = [{ id: "user-a" }, { id: "user-b" }];
let goals = [];
let clock = 0;
let failing = false;

function assertScoped(where) {
  if (!where || typeof where.userId !== "string" || where.userId === "") {
    throw new Error("TEST GUARD: goal query is not scoped to a user");
  }
}
function matches(goal, where) {
  return (
    goal.userId === where.userId && (where.id === undefined || goal.id === where.id)
  );
}
const guard = () => {
  if (failing) throw new Error("db down: SECRET-DB-DETAIL");
};

const fakePrisma = {
  user: {
    findUnique: async ({ where }) => users.find((u) => u.id === where.id) || null,
  },
  goal: {
    findMany: async ({ where }) => {
      guard();
      assertScoped(where);
      return goals
        .filter((g) => matches(g, where))
        .sort((x, y) => y.createdAt - x.createdAt || x.id.localeCompare(y.id));
    },
    count: async ({ where }) => {
      guard();
      assertScoped(where);
      return goals.filter((g) => matches(g, where)).length;
    },
    findFirst: async ({ where }) => {
      guard();
      assertScoped(where);
      return goals.find((g) => matches(g, where)) || null;
    },
    create: async ({ data }) => {
      guard();
      assertScoped(data);
      clock += 1000;
      const record = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(1_700_000_000_000 + clock),
        updatedAt: new Date(1_700_000_000_000 + clock),
      };
      goals.push(record);
      return { ...record };
    },
    update: async ({ where, data }) => {
      guard();
      assertScoped(where);
      const goal = goals.find((g) => matches(g, where));
      if (!goal) throw Object.assign(new Error("not found"), { code: "P2025" });
      Object.assign(goal, data, { updatedAt: new Date() });
      return { ...goal };
    },
    deleteMany: async ({ where }) => {
      guard();
      assertScoped(where);
      const before = goals.length;
      goals = goals.filter((g) => !matches(g, where));
      return { count: before - goals.length };
    },
  },
};

const prismaPath = require.resolve("../src/config/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const { signToken } = require("../src/utils/token");
const app = require("../src/app");

// ---------------------------------------------------------------- helpers
let server;
let base;
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => {
  goals = [];
  clock = 0;
  failing = false;
});

const cookieFor = (id) => ({ cookie: `forevia_token=${signToken(id)}` });
const A = () => cookieFor("user-a");
const B = () => cookieFor("user-b");

async function call(method, path, { headers = {}, body, raw } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

const goalBody = (over = {}) => ({
  title: "Emergency fund",
  targetAmount: 100000,
  currentAmount: 25000,
  targetDate: "",
  ...over,
});
const createFor = async (headers, over = {}) => {
  const r = await call("POST", "/api/goals", { headers, body: goalBody(over) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.goal;
};

// ------------------------------------------------------- authentication

test("every goals endpoint requires a signed-in user", async () => {
  const id = "00000000-0000-4000-8000-000000000000";
  const calls = [
    ["GET", "/api/goals"],
    ["POST", "/api/goals", goalBody()],
    ["PUT", `/api/goals/${id}`, goalBody()],
    ["DELETE", `/api/goals/${id}`],
  ];
  for (const [method, path, body] of calls) {
    const none = await call(method, path, { body });
    assert.equal(none.status, 401, `${method} no cookie`);
    const garbage = await call(method, path, { body, headers: { cookie: "forevia_token=garbage" } });
    assert.equal(garbage.status, 401, `${method} bad token`);
    const ghost = await call(method, path, { body, headers: cookieFor("deleted-user") });
    assert.equal(ghost.status, 401, `${method} token for a user that no longer exists`);
  }
  assert.equal(goals.length, 0);
});

// ---------------------------------------------------------------- create

test("create: 201, saved against the signed-in user, progress included", async () => {
  const r = await call("POST", "/api/goals", {
    headers: A(),
    body: goalBody({ targetDate: "2027-03-15" }),
  });
  assert.equal(r.status, 201);
  const g = r.body.goal;
  assert.equal(g.title, "Emergency fund");
  assert.equal(g.targetAmount, 100000);
  assert.equal(g.currentAmount, 25000);
  assert.equal(g.targetDate, "2027-03-15");
  assert.equal(g.progressPercent, 25);
  assert.equal(g.remainingAmount, 75000);
  assert.equal(g.isCompleted, false);
  assert.ok(g.id);
  assert.ok(!("userId" in g));
  assert.equal(goals.length, 1);
  assert.equal(goals[0].userId, "user-a");
});

test("create: a userId in the body cannot assign the goal to someone else", async () => {
  const r = await call("POST", "/api/goals", {
    headers: A(),
    body: goalBody({ userId: "user-b", id: "chosen-id" }),
  });
  assert.equal(r.status, 201);
  assert.equal(goals[0].userId, "user-a");
  assert.notEqual(goals[0].id, "chosen-id");
  const asB = await call("GET", "/api/goals", { headers: B() });
  assert.deepEqual(asB.body.goals, []);
});

test("create: invalid input gets 400 with field messages and saves nothing", async () => {
  const cases = [
    [{ title: "" }, "title"],
    [{ title: "x".repeat(101) }, "title"],
    [{ targetAmount: 0 }, "targetAmount"],
    [{ targetAmount: -10 }, "targetAmount"],
    [{ targetAmount: "abc" }, "targetAmount"],
    [{ targetAmount: [5] }, "targetAmount"],
    [{ currentAmount: -1 }, "currentAmount"],
    [{ currentAmount: "" }, "currentAmount"],
    [{ targetDate: "2027-02-30" }, "targetDate"],
    [{ targetDate: "2001-01-01" }, "targetDate"],
    [{ targetAmount: 2_000_000_000 }, "targetAmount"],
  ];
  for (const [over, field] of cases) {
    const r = await call("POST", "/api/goals", { headers: A(), body: goalBody(over) });
    assert.equal(r.status, 400, JSON.stringify(over));
    assert.ok(r.body.errors[field], `${field} for ${JSON.stringify(over)}`);
    assert.equal(r.body.message, "Please correct the highlighted fields.");
  }
  assert.equal(goals.length, 0);
});

test("create: an empty body or non-object body is a 400, not a crash", async () => {
  const empty = await call("POST", "/api/goals", { headers: A() });
  assert.equal(empty.status, 400);
  const arr = await call("POST", "/api/goals", { headers: A(), body: [] });
  assert.equal(arr.status, 400);
  assert.equal(goals.length, 0);
});

test("create: malformed JSON is a 400", async () => {
  const r = await call("POST", "/api/goals", { headers: A(), raw: "{not json" });
  assert.equal(r.status, 400);
  assert.equal(goals.length, 0);
});

test("create: at most 50 goals per user, and the limit is per user", async () => {
  for (let i = 0; i < 50; i += 1) await createFor(A(), { title: `Goal ${i}` });
  const over = await call("POST", "/api/goals", { headers: A(), body: goalBody() });
  assert.equal(over.status, 400);
  assert.match(over.body.message, /up to 50 goals/);
  assert.equal(goals.filter((g) => g.userId === "user-a").length, 50);
  const other = await call("POST", "/api/goals", { headers: B(), body: goalBody() });
  assert.equal(other.status, 201);
  const first = (await call("GET", "/api/goals", { headers: A() })).body.goals[0];
  const del = await call("DELETE", `/api/goals/${first.id}`, { headers: A() });
  assert.equal(del.status, 200);
  const again = await call("POST", "/api/goals", { headers: A(), body: goalBody() });
  assert.equal(again.status, 201);
});

// ------------------------------------------------------------------ list

test("list: empty for a new user", async () => {
  const r = await call("GET", "/api/goals", { headers: A() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { goals: [] });
});

test("list: only the signed-in user's goals, newest first", async () => {
  await createFor(A(), { title: "First" });
  await createFor(B(), { title: "Belongs to B" });
  await createFor(A(), { title: "Second" });
  const asA = await call("GET", "/api/goals", { headers: A() });
  assert.deepEqual(asA.body.goals.map((g) => g.title), ["Second", "First"]);
  const asB = await call("GET", "/api/goals", { headers: B() });
  assert.deepEqual(asB.body.goals.map((g) => g.title), ["Belongs to B"]);
  assert.ok(!JSON.stringify(asA.body).includes("user-"), "no user ids in the response");
});

test("list: a reached or exceeded goal is capped at 100% with nothing remaining", async () => {
  await createFor(A(), { title: "Done", targetAmount: 100, currentAmount: 250 });
  const [g] = (await call("GET", "/api/goals", { headers: A() })).body.goals;
  assert.equal(g.progressPercent, 100);
  assert.equal(g.remainingAmount, 0);
  assert.equal(g.isCompleted, true);
});

// ---------------------------------------------------------------- update

test("update: changes the fields and recalculates progress", async () => {
  const g = await createFor(A(), { targetDate: "2027-03-15" });
  const r = await call("PUT", `/api/goals/${g.id}`, {
    headers: A(),
    body: goalBody({ title: "Renamed", targetAmount: 50000, currentAmount: 40000, targetDate: "2027-06-01" }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.goal.title, "Renamed");
  assert.equal(r.body.goal.progressPercent, 80);
  assert.equal(r.body.goal.remainingAmount, 10000);
  assert.equal(r.body.goal.targetDate, "2027-06-01");
  assert.equal(goals.length, 1);
});

test("update: an empty date clears it", async () => {
  const g = await createFor(A(), { targetDate: "2027-03-15" });
  const r = await call("PUT", `/api/goals/${g.id}`, { headers: A(), body: goalBody({ targetDate: "" }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.goal.targetDate, null);
});

test("update: invalid input is a 400 and leaves the goal unchanged", async () => {
  const g = await createFor(A());
  const r = await call("PUT", `/api/goals/${g.id}`, {
    headers: A(),
    body: goalBody({ title: "", targetAmount: 0 }),
  });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.title && r.body.errors.targetAmount);
  assert.equal(goals[0].title, "Emergency fund");
  assert.equal(goals[0].targetAmount, 100000);
});

test("update: a saved date that has since passed can stay; changing it to a past date cannot", async () => {
  const g = await createFor(A());
  goals[0].targetDate = new Date("2025-01-01T00:00:00.000Z"); // passed since creation
  const keep = await call("PUT", `/api/goals/${g.id}`, {
    headers: A(),
    body: goalBody({ currentAmount: 30000, targetDate: "2025-01-01" }),
  });
  assert.equal(keep.status, 200);
  assert.equal(keep.body.goal.targetDate, "2025-01-01");
  const change = await call("PUT", `/api/goals/${g.id}`, {
    headers: A(),
    body: goalBody({ targetDate: "2025-02-02" }),
  });
  assert.equal(change.status, 400);
  assert.ok(change.body.errors.targetDate);
});

test("update: userId and id in the body are ignored", async () => {
  const g = await createFor(A());
  const r = await call("PUT", `/api/goals/${g.id}`, {
    headers: A(),
    body: goalBody({ userId: "user-b", id: "other" }),
  });
  assert.equal(r.status, 200);
  assert.equal(goals[0].userId, "user-a");
  assert.equal(goals[0].id, g.id);
});

test("update: a goal that doesn't exist is 404", async () => {
  const r = await call("PUT", "/api/goals/00000000-0000-4000-8000-000000000000", {
    headers: A(),
    body: goalBody(),
  });
  assert.equal(r.status, 404);
  assert.equal(r.body.message, "Goal not found.");
});

test("update: deleted between lookup and save is a 404 (not a 500)", async () => {
  const g = await createFor(A());
  const realFindFirst = fakePrisma.goal.findFirst;
  fakePrisma.goal.findFirst = async (args) => {
    const found = await realFindFirst(args);
    goals = []; // someone deletes it right after the lookup
    return found;
  };
  try {
    const r = await call("PUT", `/api/goals/${g.id}`, { headers: A(), body: goalBody() });
    assert.equal(r.status, 404);
  } finally {
    fakePrisma.goal.findFirst = realFindFirst;
  }
});

// ---------------------------------------------------------------- delete

test("delete: removes the goal, then it is gone", async () => {
  const g = await createFor(A());
  const r = await call("DELETE", `/api/goals/${g.id}`, { headers: A() });
  assert.equal(r.status, 200);
  assert.equal(r.body.message, "Goal deleted.");
  assert.equal(goals.length, 0);
  const again = await call("DELETE", `/api/goals/${g.id}`, { headers: A() });
  assert.equal(again.status, 404);
});

// ------------------------------------------------------------- ownership

test("ownership: another user cannot update, delete or see a goal, and it stays intact", async () => {
  const g = await createFor(A(), { title: "A's private goal" });

  const put = await call("PUT", `/api/goals/${g.id}`, {
    headers: B(),
    body: goalBody({ title: "Hijacked", currentAmount: 1 }),
  });
  assert.equal(put.status, 404);
  assert.equal(put.body.message, "Goal not found.");

  const del = await call("DELETE", `/api/goals/${g.id}`, { headers: B() });
  assert.equal(del.status, 404);

  const list = await call("GET", "/api/goals", { headers: B() });
  assert.deepEqual(list.body.goals, []);

  assert.equal(goals.length, 1);
  assert.equal(goals[0].title, "A's private goal");
  assert.equal(goals[0].currentAmount, 25000);
  assert.equal(goals[0].userId, "user-a");
});

test("ownership: a foreign goal looks exactly like a missing one", async () => {
  const g = await createFor(A());
  const foreign = await call("DELETE", `/api/goals/${g.id}`, { headers: B() });
  const missing = await call("DELETE", "/api/goals/00000000-0000-4000-8000-000000000000", { headers: B() });
  assert.deepEqual(foreign, missing);
});

test("ownership: ids that can't be real are 404 without touching the database", async () => {
  let touched = false;
  const real = fakePrisma.goal.findFirst;
  fakePrisma.goal.findFirst = async () => {
    touched = true;
    return null;
  };
  try {
    const r = await call("PUT", `/api/goals/${"x".repeat(101)}`, { headers: A(), body: goalBody() });
    assert.equal(r.status, 404);
    assert.equal(touched, false);
  } finally {
    fakePrisma.goal.findFirst = real;
  }
});

// ------------------------------------------------------- failure handling

test("database failures are a generic 500 that leaks nothing and logs no goal data", async () => {
  const g = await createFor(A(), { title: "PRIVATE-TITLE" });
  failing = true;
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const results = [
      await call("GET", "/api/goals", { headers: A() }),
      await call("POST", "/api/goals", { headers: A(), body: goalBody({ title: "PRIVATE-TITLE" }) }),
      await call("PUT", `/api/goals/${g.id}`, { headers: A(), body: goalBody({ title: "PRIVATE-TITLE" }) }),
      await call("DELETE", `/api/goals/${g.id}`, { headers: A() }),
    ];
    for (const r of results) {
      assert.equal(r.status, 500);
      assert.ok(typeof r.body.message === "string" && r.body.message.startsWith("Unable to"));
      assert.ok(!JSON.stringify(r.body).includes("SECRET-DB-DETAIL"));
    }
    const text = logged.join(" ");
    assert.ok(!text.includes("SECRET-DB-DETAIL"));
    assert.ok(!text.includes("PRIVATE-TITLE"));
  } finally {
    console.error = original;
  }
});

test("unsupported methods and unknown goal routes don't match", async () => {
  const patch = await call("PATCH", "/api/goals/abc", { headers: A(), body: goalBody() });
  assert.equal(patch.status, 404);
  const put = await call("PUT", "/api/goals", { headers: A(), body: goalBody() });
  assert.equal(put.status, 404);
});
