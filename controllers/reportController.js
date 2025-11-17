const Donation = require("../models/Donation");
const User = require("../models/User");
const Cause = require("../models/Cause");
const Report = require("../models/Report");

// @desc    Get report data for specific donor
// @route   GET /api/reports/donor/:userId
// @access  Private/Admin
exports.getDonorReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, causeId } = req.query;

    // Build query
    let query = {
      user: userId,
      status: { $in: ["verified", "pending"] },
    };

    // Add date filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add cause filter
    if (causeId) {
      query.cause = causeId;
    }

    // Get user data
    const user = await User.findById(userId).select("name email phone");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get donations
    const donations = await Donation.find(query)
      .populate("cause", "title category")
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
    const totalTransactions = donations.length;

    // Save report log
    await Report.create({
      reportType: "donor",
      user: userId,
      startDate: startDate || null,
      endDate: endDate || null,
      totalAmount,
      totalTransactions,
      generatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        summary: {
          totalTransactions,
          totalAmount,
        },
        donations: donations.map((d) => ({
          _id: d._id,
          date: d.createdAt,
          program: d.cause?.title || "N/A",
          category: d.cause?.category || "N/A",
          amount: d.amount,
          status: d.distributionStatus,
        })),
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          causeId: causeId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error generating donor report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
};

// @desc    Get report data for all donations
// @route   GET /api/reports/all
// @access  Private/Admin
exports.getAllDonationsReport = async (req, res) => {
  try {
    const { startDate, endDate, causeId, status } = req.query;

    // Build query
    let query = {};

    // Add date filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Add cause filter
    if (causeId) {
      query.cause = causeId;
    }

    // Add status filter
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ["verified", "pending"] };
    }

    // Get donations
    const donations = await Donation.find(query)
      .populate("user", "name email")
      .populate("cause", "title category")
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
    const totalTransactions = donations.length;

    // Group by status
    const byStatus = {
      distributed: donations.filter(
        (d) => d.distributionStatus === "distributed"
      ).length,
      pending: donations.filter((d) => d.distributionStatus === "pending")
        .length,
    };

    // Save report log
    await Report.create({
      reportType: "all",
      startDate: startDate || null,
      endDate: endDate || null,
      totalAmount,
      totalTransactions,
      generatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTransactions,
          totalAmount,
          byStatus,
        },
        donations: donations.map((d) => ({
          _id: d._id,
          date: d.createdAt,
          donor: {
            name: d.user?.name || "Anonymous",
            email: d.user?.email || "-",
          },
          program: d.cause?.title || "N/A",
          category: d.cause?.category || "N/A",
          amount: d.amount,
          status: d.distributionStatus,
        })),
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          causeId: causeId || null,
          status: status || null,
        },
      },
    });
  } catch (error) {
    console.error("Error generating all donations report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
};

// @desc    Get list of all donors (for dropdown filter)
// @route   GET /api/reports/donors
// @access  Private/Admin
exports.getAllDonors = async (req, res) => {
  try {
    const donors = await Donation.find({ status: "verified" })
      .populate("user", "name email")
      .distinct("user");

    const uniqueDonors = await User.find({ _id: { $in: donors } }).select(
      "name email"
    );

    res.status(200).json({
      success: true,
      data: uniqueDonors,
    });
  } catch (error) {
    console.error("Error fetching donors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch donors",
      error: error.message,
    });
  }
};
