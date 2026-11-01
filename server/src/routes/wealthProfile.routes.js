const express = require("express");
const router = express.Router();

const {
  getWealthProfile,
  saveWealthProfile,
} = require("../controllers/wealthProfile.controller");
const requireAuth = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/", getWealthProfile);
router.put("/", saveWealthProfile);

module.exports = router;
