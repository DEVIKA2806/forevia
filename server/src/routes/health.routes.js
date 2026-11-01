const express = require("express");
const router = express.Router();

// Simple health-check endpoint. Its only job is to confirm the server
// process is up and responding — it does NOT touch the database. That
// keeps it useful even if Postgres/Prisma isn't configured yet, which is
// exactly what we need to verify in Phase 1.
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "forevia-server",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
