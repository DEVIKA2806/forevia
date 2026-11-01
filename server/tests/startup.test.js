// Phase 13 startup test. Run with:  node --test tests/startup.test.js
// Launches the real server.js as a child process with different JWT_SECRET
// values and checks it warns, refuses to start in production, or starts.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const serverJs = path.join(__dirname, "..", "server.js");
const EXAMPLE = "replace-this-with-a-long-random-string";
const GOOD = "a".repeat(20) + "B1".repeat(10); // 40 characters

// Starts server.js in an empty folder (so no real .env is read) and resolves
// when it prints that it is running, or exits.
function launch(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [serverJs], {
      cwd: os.tmpdir(),
      env: { PATH: process.env.PATH, DATABASE_URL: "postgresql://u:p@localhost:5432/d", PORT: "0", ...env },
    });
    let output = "";
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve({ output, ...result });
    };
    const timer = setTimeout(() => finish({ started: false, exitCode: null, timedOut: true }), 8000);
    child.stdout.on("data", (d) => {
      output += d;
      if (/running on/.test(output)) finish({ started: true, exitCode: null });
    });
    child.stderr.on("data", (d) => { output += d; });
    child.on("exit", (code) => finish({ started: false, exitCode: code }));
  });
}

test("development: the example secret starts, with a loud warning that never shows the secret", async () => {
  const r = await launch({ NODE_ENV: "development", JWT_SECRET: EXAMPLE });
  assert.equal(r.started, true, r.output);
  assert.match(r.output, /WARNING: JWT_SECRET/);
  assert.ok(!r.output.includes(EXAMPLE));
});

test("development: a short or missing secret also warns", async () => {
  for (const secret of ["short", undefined]) {
    const r = await launch({ NODE_ENV: "development", ...(secret ? { JWT_SECRET: secret } : {}) });
    assert.equal(r.started, true, r.output);
    assert.match(r.output, /WARNING: JWT_SECRET/);
  }
});

test("development: a long random secret starts silently", async () => {
  const r = await launch({ NODE_ENV: "development", JWT_SECRET: GOOD });
  assert.equal(r.started, true, r.output);
  assert.ok(!/WARNING/.test(r.output), r.output);
  assert.ok(!r.output.includes(GOOD));
});

test("production: refuses to start with the example, a short, or a missing secret", async () => {
  for (const secret of [EXAMPLE, "short", undefined]) {
    const r = await launch({ NODE_ENV: "production", ...(secret ? { JWT_SECRET: secret } : {}) });
    assert.equal(r.started, false, `started with ${secret}`);
    assert.equal(r.exitCode, 1, r.output);
    assert.match(r.output, /Refusing to start in production/);
    if (secret) assert.ok(!r.output.includes(secret) || secret === "short");
  }
});

test("production: a strong secret starts normally", async () => {
  const r = await launch({ NODE_ENV: "production", JWT_SECRET: GOOD });
  assert.equal(r.started, true, r.output);
});
