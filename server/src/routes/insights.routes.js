const express = require("express");
const router = express.Router();

const { generateInsights } = require("../controllers/insights.controller");
const requireAuth = require("../middleware/auth.middleware");
const userRateLimit = require("../middleware/userRateLimit");

// Router-level auth, same pattern as the other routes.
router.use(requireAuth);

// 5 generations per user per 10 minutes. Each one is a paid AI call.
router.post(
  "/",
  userRateLimit({ windowMs: 10 * 60 * 1000, max: 5 }),
  generateInsights
);

module.exports = router;
