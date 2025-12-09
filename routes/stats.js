const express = require("express");
const { getPublicStats } = require("../controllers/statsController");

const router = express.Router();

// Public routes
router.get("/public", getPublicStats);

module.exports = router;
