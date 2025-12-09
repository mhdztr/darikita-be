const Donation = require("../models/Donation");
const User = require("../models/User");
const Cause = require("../models/Cause");

// @desc    Get public statistics
// @route   GET /api/stats/public
// @access  Public
exports.getPublicStats = async (req, res) => {
  try {
    // 1. Total Verified Donations Amount
    const totalAmountResult = await Donation.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;

    // 2. Total Donors (count of users with role 'donatur')
    const totalDonors = await User.countDocuments({ role: "donatur" });

    // 3. Active Programs
    const activePrograms = await Cause.countDocuments({ status: "active" });

    // 4. Beneficiaries (Total Causes/Programs) - replacing "UMKM Terbantu"
    // Since this is a general donation platform, "Programs" or "Beneficiaries" is more appropriate than "UMKM"
    // We'll count total causes as the number of beneficiaries/programs helped
    const beneficiaries = await Cause.countDocuments();

    res.json({
      success: true,
      data: {
        totalAmount,
        totalDonors,
        activePrograms,
        beneficiaries,
      },
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};
