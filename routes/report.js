const express = require("express");
const {
  getDonorReport,
  getAllDonationsReport,
  getAllDonors,
} = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const { roleCheck } = require("../middleware/roleCheck");

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(roleCheck(["admin"]));

// Get donors list
router.get("/donors", getAllDonors);

// Get donor report
router.get("/donor/:userId", getDonorReport);

// Get all donations report
router.get("/all", getAllDonationsReport);

module.exports = router;
