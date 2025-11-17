const User = require("../models/User");
const Cause = require("../models/Cause");
const Donation = require("../models/Donation");

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Total donations count
    const totalDonations = await Donation.countDocuments();

    // Total amount (verified only)
    const totalAmountResult = await Donation.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;

    // Distributed amount
    const distributedAmountResult = await Donation.aggregate([
      { $match: { distributionStatus: "distributed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const distributedAmount = distributedAmountResult[0]?.total || 0;

    // Pending amount
    const pendingAmount = totalAmount - distributedAmount;

    // Active causes
    const activeCauses = await Cause.countDocuments({ status: "active" });

    // Total causes
    const totalCauses = await Cause.countDocuments();

    // Total users
    const totalUsers = await User.countDocuments({ role: "donatur" });

    // Pending donations (need verification)
    const pendingDonations = await Donation.countDocuments({
      status: "pending",
    });

    // Recent donations (last 5)
    const recentDonations = await Donation.find()
      .populate("user", "name email")
      .populate("cause", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    // Donations by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const donationsByMonth = await Donation.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: "verified",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalDonations,
          totalAmount,
          distributedAmount,
          pendingAmount,
          activeCauses,
          totalCauses,
          totalUsers,
          pendingDonations,
        },
        recentDonations,
        donationsByMonth,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["donatur", "admin", "auditor"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// @desc    Get all donations (admin view)
// @route   GET /api/admin/donations
// @access  Private/Admin
exports.getAllDonationsAdmin = async (req, res) => {
  try {
    const { status, distributionStatus } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (distributionStatus) filter.distributionStatus = distributionStatus;

    const donations = await Donation.find(filter)
      .populate("user", "name email")
      .populate("cause", "title category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: donations.length,
      data: donations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching donations",
      error: error.message,
    });
  }
};

// @desc    Verify donation manually
// @route   PUT /api/admin/donations/:id/verify
// @access  Private/Admin
exports.verifyDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    if (donation.status === "verified") {
      return res.status(400).json({
        success: false,
        message: "Donation already verified",
      });
    }

    // Update donation status
    donation.status = "verified";
    donation.verifiedAt = Date.now();
    donation.verifiedBy = req.user.id;
    await donation.save();

    // Update cause current amount
    const cause = await Cause.findById(donation.cause);
    if (cause) {
      cause.currentAmount += donation.amount;
      cause.totalDonors += 1;
      await cause.save();
    }

    res.json({
      success: true,
      message: "Donation verified successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying donation",
      error: error.message,
    });
  }
};

// @desc    Update distribution status
// @route   PUT /api/admin/donations/:id/distribution
// @access  Private/Admin
exports.updateDistributionStatus = async (req, res) => {
  try {
    const { distributionStatus, distributionNote, distributionProof } =
      req.body;

    if (!["pending", "distributed", "used"].includes(distributionStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid distribution status",
      });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    donation.distributionStatus = distributionStatus;
    donation.distributionNote = distributionNote || "";

    if (distributionProof && Array.isArray(distributionProof)) {
      donation.distributionProof = distributionProof;
    }

    if (distributionStatus !== "pending") {
      donation.distributedAt = Date.now();
    }

    await donation.save();

    res.json({
      success: true,
      message: "Distribution status updated successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating distribution status",
      error: error.message,
    });
  }
};
