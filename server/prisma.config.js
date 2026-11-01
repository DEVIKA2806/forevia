// Prisma 7 configuration file.
//
// Why this file exists: starting in Prisma 7, the `url` field inside the
// `datasource` block of schema.prisma is no longer read by the CLI for
// Migrate/Studio commands. The connection URL (and other CLI-level config,
// like where migrations live) now belongs here instead. schema.prisma still
// declares the datasource *provider* ("postgresql") and is still used to
// generate the Prisma Client — this file only supplies the pieces the CLI
// needs to actually connect to the database.
//
// Why DIRECT_URL and not DATABASE_URL: Neon's pooled connection (the
// "-pooler" host) goes through PgBouncer in transaction mode, which doesn't
// support the session-level features Prisma Migrate needs (advisory locks,
// prepared statements) — that's what caused the P1001 error. Migrate needs
// a direct, non-pooled connection to the database, so the CLI reads
// DIRECT_URL here. The running Express app is unaffected: it still
// connects via the pooled DATABASE_URL through the driver adapter in
// src/config/prisma.js, which is what you want at runtime for connection
// efficiency.
//
// "dotenv/config" loads server/.env before anything below runs.
require("dotenv/config");
const { defineConfig, env } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
