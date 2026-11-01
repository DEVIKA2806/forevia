const express = require("express");
const router = express.Router();

const { signup, login, logout, me } = require("../controllers/auth.controller");
const requireAuth = require("../middleware/auth.middleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// requireAuth runs first: it verifies the JWT cookie and attaches
// req.user before `me` ever executes. If verification fails, requireAuth
// responds 401 itself and `me` never runs.
router.get("/me", requireAuth, me);

module.exports = router;
