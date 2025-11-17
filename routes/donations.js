const express = require("express");
const {
  createDonation,
  getAllDonations,
  getDonation,
  getUserDonations,
  verifyDonation,
  updateDonationStatus,
  getDonationStats,
} = require("../controllers/donationController");
const { protect } = require("../middleware/auth");
const { roleCheck } = require("../middleware/roleCheck");

const router = express.Router();

// Protected routes - Donatur
router.post("/", protect, createDonation); // Create donation & get Midtrans token
router.get("/my-donations", protect, getUserDonations); // Get user's donation history
router.get("/:id", protect, getDonation); // Get single donation detail

// Protected routes - Admin
router.get("/", protect, roleCheck(["admin", "auditor"]), getAllDonations); // Get all donations (for admin/auditor)
router.put("/:id/verify", protect, roleCheck(["admin"]), verifyDonation); // Verify payment
router.put("/:id/status", protect, roleCheck(["admin"]), updateDonationStatus); // Mark as distributed/used

// Protected routes - Auditor
router.get(
  "/stats/overview",
  protect,
  roleCheck(["auditor", "admin"]),
  getDonationStats
); // Get donation statistics

module.exports = router;
