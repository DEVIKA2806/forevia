const express = require("express");
const router = express.Router();

const { getProfile, updateProfile } = require("../controllers/user.controller");
const requireAuth = require("../middleware/auth.middleware");

// Reuses the same requireAuth middleware written in Phase 4 — no new auth
// logic. Applied at the router level so every route in this file is
// protected, and any route added here later is protected by default.
router.use(requireAuth);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

module.exports = router;
