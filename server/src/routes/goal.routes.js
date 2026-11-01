const express = require("express");
const router = express.Router();

const {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} = require("../controllers/goal.controller");
const requireAuth = require("../middleware/auth.middleware");

// Router-level auth, same pattern as the profile routes.
router.use(requireAuth);

router.get("/", listGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
