const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const healthProfileRoutes = require("./routes/healthProfile.routes");
const wealthProfileRoutes = require("./routes/wealthProfile.routes");
const calculationRoutes = require("./routes/calculation.routes");
const insightsRoutes = require("./routes/insights.routes");
const goalRoutes = require("./routes/goal.routes");

const app = express();

// Don't advertise the framework in every response.
app.disable("x-powered-by");

// --- Core middleware ---
// cors: the React app (Vite dev server on a different port) needs explicit
// permission to call this API, and "credentials: true" is required because
// we'll be sending the JWT as an httpOnly cookie, not an Authorization header.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parses incoming JSON request bodies (e.g. login/signup forms) into req.body
app.use(express.json());

// Parses cookies on incoming requests into req.cookies — needed to read the
// JWT cookie once auth is implemented in Phase 4.
app.use(cookieParser());

// --- Routes ---
// Mounted under /api/* so the frontend has one consistent base path, and so
// this API could later sit behind a reverse proxy alongside other services
// without path collisions.
app.use("/api/health-check", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/health-profile", healthProfileRoutes);
app.use("/api/wealth-profile", wealthProfileRoutes);
app.use("/api/calculations", calculationRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/goals", goalRoutes);

// Fallback for any route that doesn't exist
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Last resort for errors that happen outside a controller's own try/catch,
// such as a request body that isn't valid JSON or is too large. Without
// this, Express replies with an HTML page (including a stack trace outside
// production) that the frontend can't read. Always JSON, never internals.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err && err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ message: "The request body is not valid JSON." });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ message: "The request is too large." });
  }
  const status = err && (err.status || err.statusCode);
  if (status >= 400 && status < 500) {
    return res
      .status(status)
      .json({ message: "The request could not be processed." });
  }

  console.error("Unhandled request error.");
  return res
    .status(500)
    .json({ message: "Something went wrong. Please try again." });
});

module.exports = app;
