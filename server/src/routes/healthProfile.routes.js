const express = require("express");
const router = express.Router();

const {
  getHealthProfile,
  saveHealthProfile,
} = require("../controllers/healthProfile.controller");
const requireAuth = require("../middleware/auth.middleware");

// Applied at router level, so every route here — and any added later —
// is protected by the existing Phase 4 auth middleware.
router.use(requireAuth);

router.get("/", getHealthProfile);
router.put("/", saveHealthProfile);

module.exports = router;
