const express = require("express");
const { handleNotification } = require("../controllers/midtransController");

const router = express.Router();

// Midtrans notification endpoint (no auth needed - called by Midtrans)
router.post("/notification", handleNotification);

module.exports = router;
