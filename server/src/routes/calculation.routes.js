const express = require("express");
const router = express.Router();

const {
  getCalculationSummary,
} = require("../controllers/calculation.controller");
const { simulate } = require("../controllers/simulation.controller");
const { getProjections } = require("../controllers/projection.controller");
const requireAuth = require("../middleware/auth.middleware");

// Router-level auth, same pattern as the profile routes.
router.use(requireAuth);

router.get("/summary", getCalculationSummary);
router.post("/simulate", simulate);
router.get("/projections", getProjections);

module.exports = router;
