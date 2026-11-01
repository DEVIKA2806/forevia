# Forevia — Health + Wealth Simulator

Forevia helps a person understand how their current health, lifestyle, and
financial choices could shape different possible futures — most importantly
through the **What-If Simulator**, which shows a "current path" vs. a
"scenario" side by side, with the assumptions and reasoning made explicit
(never a guaranteed prediction).

This repo is a full-stack project: **React (Vite) → REST API → Express →
Prisma → PostgreSQL**.

## Project structure

```
forevia/
├── client/     React + Vite frontend
├── server/     Express + Prisma REST API
└── README.md
```

## Status: Phase 1 — Project Scaffolding

At this stage the project only proves the skeleton works end to end:

- The React app boots via Vite.
- The Express app boots and exposes one route: `GET /api/health-check`.
- Prisma is configured to talk to PostgreSQL, with a single `User` model
  (just enough to prove a database connection and migration).

No real pages, authentication, or business logic exist yet — those come in
later phases.

## Prerequisites

- Node.js 18+ and npm
- A running PostgreSQL instance (local install, or a free hosted instance
  such as Neon/Supabase/Railway — any of these work with Prisma)

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # then edit .env with your real DATABASE_URL, DIRECT_URL, and JWT_SECRET
npx prisma generate    # generates the Prisma Client based on schema.prisma
npx prisma migrate dev --name init   # creates the `users` table in your database
npm run dev            # starts the API on http://localhost:5000
```

**Note on Prisma 7:** this project pins Prisma to `7.10.0`. Prisma 7 changed
how the CLI and the runtime Client get their database connection:
- `prisma.config.js` (not `schema.prisma`) supplies the connection URL to CLI
  commands like `migrate` and `studio` — via `DIRECT_URL`.
- The runtime `PrismaClient` no longer picks up a URL from `schema.prisma`
  either — it requires an explicit driver adapter
  (`@prisma/adapter-pg` + `pg`), which is wired up in
  `src/config/prisma.js` and uses `DATABASE_URL`.

**Two env vars, two purposes (important for Neon or any pooled Postgres):**
- `DATABASE_URL` — the **pooled** connection (hostname contains `-pooler`
  on Neon). Used by the running Express app for efficient connection reuse.
- `DIRECT_URL` — the **direct/non-pooled** connection (no `-pooler` in the
  hostname). Used only by the Prisma CLI (`migrate`, `studio`), because
  pooled connections (PgBouncer in transaction mode) don't support the
  session-level features — advisory locks, prepared statements — that
  schema migrations rely on. Trying to run `migrate dev` against a pooled
  URL is a common cause of `P1001` connection errors.

If you're not using Neon or another pooled provider, `DATABASE_URL` and
`DIRECT_URL` can simply be the same value.

### 2. Client

In a second terminal:

```bash
cd client
npm install
npm run dev             # starts the frontend on http://localhost:5173
```

## Verifying Phase 1 works

1. With the server running, visit (or `curl`):
   `http://localhost:5000/api/health-check`
   Expected response:
   ```json
   { "status": "ok", "service": "forevia-server", "timestamp": "..." }
   ```
2. With the client running, visit `http://localhost:5173` — you should see
   the default Vite + React starter page (this gets replaced with the real
   Forevia landing page in Phase 3).
3. Confirm the database connection by running `npx prisma studio` from
   `server/` — it should open a browser window showing the empty `User`
   table with no errors.

## Environment variables (server/.env)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection, used by the running app |
| `DIRECT_URL` | Direct/non-pooled PostgreSQL connection, used by the Prisma CLI (migrate, studio) |
| `PORT` | Port the Express server listens on |
| `JWT_SECRET` | Secret used to sign authentication tokens (added in Phase 4) |
| `JWT_EXPIRES_IN` | How long a login session stays valid |
| `CLIENT_URL` | The frontend's origin, used to configure CORS |
| `NODE_ENV` | `development` or `production` |

Never commit the real `.env` file — only `.env.example` is tracked in git.

## Tech stack

- **Frontend:** React, Vite, React Router (added Phase 2), plain CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT stored in an httpOnly cookie, bcryptjs for password hashing
- **Icons:** Lucide React (added Phase 2)
- **Charts:** Recharts (added when Health/Wealth pages are built)

No TypeScript, Redux, Docker, or GraphQL — kept intentionally simple so the
whole stack is easy to understand and explain.
