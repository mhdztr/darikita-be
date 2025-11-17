const Donation = require("../models/Donation");
const Cause = require("../models/Cause");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

// @desc    Get auditor dashboard statistics
// @route   GET /api/auditor/stats
// @access  Private/Auditor
exports.getAuditorStats = async (req, res) => {
  try {
    // Total causes
    const totalCauses = await Cause.countDocuments();
    const activeCauses = await Cause.countDocuments({ status: "active" });

    // Cause audit status
    const auditStatusCounts = await Cause.aggregate([
      {
        $group: {
          _id: "$auditStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const pendingAudit = auditStatusCounts.find(
      (s) => s._id === "pending_audit"
    )?.count || 0;
    const verifiedAudit = auditStatusCounts.find(
      (s) => s._id === "audit_verified"
    )?.count || 0;
    const flaggedAudit = auditStatusCounts.find(
      (s) => s._id === "audit_flagged"
    )?.count || 0;

    // Donation statistics
    const totalDonationsResult = await Donation.aggregate([
      { $match: { status: "verified" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDonations = totalDonationsResult[0] || {
      totalAmount: 0,
      count: 0,
    };

    // Distributed amount
    const distributedResult = await Donation.aggregate([
      { $match: { distributionStatus: { $in: ["distributed", "used"] } } },
      {
        $group: {
          _id: null,
          distributedAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const distributed = distributedResult[0] || {
      distributedAmount: 0,
      count: 0,
    };

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

    // Donations by category
    const donationsByCategory = await Donation.aggregate([
      { $match: { status: "verified" } },
      {
        $lookup: {
          from: "causes",
          localField: "cause",
          foreignField: "_id",
          as: "causeData",
        },
      },
      { $unwind: "$causeData" },
      {
        $group: {
          _id: "$causeData.category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // ✨ UPDATED: Causes with audit status for transparency
    const causesAudit = await Cause.aggregate([
      {
        $project: {
          title: 1,
          category: 1,
          currentAmount: 1,
          disbursedAmount: 1,
          auditStatus: 1,
          auditedAt: 1,
          auditedBy: 1,
          remainingFunds: {
            $subtract: ["$currentAmount", "$disbursedAmount"],
          },
          disbursementPercentage: {
            $cond: [
              { $eq: ["$currentAmount", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$disbursedAmount", "$currentAmount"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      { $sort: { currentAmount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCauses,
          activeCauses,
          totalDonationAmount: totalDonations.totalAmount,
          totalDonationCount: totalDonations.count,
          distributedAmount: distributed.distributedAmount,
          distributedCount: distributed.count,
          remainingAmount:
            totalDonations.totalAmount - distributed.distributedAmount,
          pendingAudit,
          verifiedAudit,
          flaggedAudit,
        },
        charts: {
          donationsByMonth,
          donationsByCategory,
          causesAudit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching auditor stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching auditor statistics",
      error: error.message,
    });
  }
};

// @desc    Get all causes for audit (not individual donations)
// @route   GET /api/auditor/causes
// @access  Private/Auditor
exports.getAllCausesForAudit = async (req, res) => {
  try {
    const { auditStatus, category, startDate, endDate } = req.query;
    let filter = {};

    if (auditStatus) filter.auditStatus = auditStatus;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const causes = await Cause.find(filter)
      .populate("createdBy", "name email")
      .populate("auditedBy", "name email")
      .sort({ createdAt: -1 });

    // Enrich dengan donation stats untuk setiap cause
    const causesWithStats = await Promise.all(
      causes.map(async (cause) => {
        const donationStats = await Donation.aggregate([
          { $match: { cause: cause._id } },
          {
            $group: {
              _id: null,
              totalReceived: {
                $sum: {
                  $cond: [{ $eq: ["$status", "verified"] }, "$amount", 0],
                },
              },
              totalDisbursed: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$distributionStatus",
                        ["distributed", "used"],
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
              totalDonations: { $sum: 1 },
              verifiedDonations: {
                $sum: {
                  $cond: [{ $eq: ["$status", "verified"] }, 1, 0],
                },
              },
            },
          },
        ]);

        const stats = donationStats[0] || {
          totalReceived: 0,
          totalDisbursed: 0,
          totalDonations: 0,
          verifiedDonations: 0,
        };

        return {
          ...cause.toObject(),
          donationStats: stats,
          remainingFunds: stats.totalReceived - stats.totalDisbursed,
          disbursementPercentage:
            stats.totalReceived > 0
              ? Math.round(
                  (stats.totalDisbursed / stats.totalReceived) * 100
                )
              : 0,
        };
      })
    );

    res.json({
      success: true,
      count: causesWithStats.length,
      data: causesWithStats,
    });
  } catch (error) {
    console.error("Error fetching causes for audit:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching causes for audit",
      error: error.message,
    });
  }
};

// @desc    Get cause audit detail with all donations in that cause
// @route   GET /api/auditor/causes/:id
// @access  Private/Auditor
exports.getCauseAuditDetail = async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id)
      .populate("createdBy", "name email phone")
      .populate("auditedBy", "name email");

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    // Get all donations for this cause
    const donations = await Donation.find({ cause: req.params.id })
      .populate("user", "name email phone")
      .populate("verifiedBy", "name")
      .sort({ createdAt: -1 });

    // Calculate summary statistics
    const stats = {
      totalDonations: donations.length,
      totalReceived: donations
        .filter((d) => d.status === "verified")
        .reduce((sum, d) => sum + d.amount, 0),
      totalDisbursed: donations
        .filter((d) => d.distributionStatus === "distributed" || d.distributionStatus === "used")
        .reduce((sum, d) => sum + d.amount, 0),
      verifiedDonations: donations.filter(
        (d) => d.status === "verified"
      ).length,
      pendingDonations: donations.filter(
        (d) => d.status === "pending"
      ).length,
      failedDonations: donations.filter(
        (d) => d.status === "failed"
      ).length,
    };

    stats.remainingFunds = stats.totalReceived - stats.totalDisbursed;
    stats.disbursementPercentage =
      stats.totalReceived > 0
        ? Math.round((stats.totalDisbursed / stats.totalReceived) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        cause: cause.toObject(),
        donations,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching cause audit detail:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cause audit detail",
      error: error.message,
    });
  }
};

// @desc    Mark cause/program as audited
// @route   PUT /api/auditor/causes/:id/audit
// @access  Private/Auditor
exports.markCauseAudited = async (req, res) => {
  try {
    const { auditStatus, auditNotes } = req.body;

    if (!["audit_verified", "audit_flagged"].includes(auditStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit status",
      });
    }

    const cause = await Cause.findById(req.params.id);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    // Update cause audit status
    cause.auditStatus = auditStatus;
    cause.auditedBy = req.user.id;
    cause.auditedAt = Date.now();
    cause.auditNotes = auditNotes || "";

    // ✅ Save audit document URL if file uploaded
    if (req.file) {
      cause.auditDocument = req.file.path; // Cloudinary URL
    }

    await cause.save();

    // Create audit log
    await AuditLog.create({
      actor: req.user.id,
      action: auditStatus === "audit_verified" ? "audit_report_verified" : "audit_report_flagged",
      targetType: "Cause",
      targetId: cause._id,
      changes: {
        auditStatus: {
          from: "pending_audit",
          to: auditStatus,
        },
      },
      metadata: {
        description: `Cause "${cause.title}" marked as ${auditStatus}`,
        auditDocument: req.file ? req.file.path : null,
      },
    });

    res.json({
      success: true,
      message: "Cause audit status updated successfully",
      data: cause,
    });
  } catch (error) {
    console.error("Error updating cause audit status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cause audit status",
      error: error.message,
    });
  }
};

// @desc    Get audit logs
// @route   GET /api/auditor/logs
// @access  Private/Auditor
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, startDate, endDate, limit = 50 } = req.query;
    let filter = {};

    if (action) filter.action = action;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filter)
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const totalLogs = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      count: logs.length,
      total: totalLogs,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      error: error.message,
    });
  }
};

// @desc    Generate audit report for causes (not individual donations)
// @route   GET /api/auditor/report
// @access  Private/Auditor
exports.generateAuditReport = async (req, res) => {
  try {
    const { startDate, endDate, category, auditStatus } = req.query;
    let filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (category) filter.category = category;
    if (auditStatus) filter.auditStatus = auditStatus;

    const causes = await Cause.find(filter)
      .populate("createdBy", "name email")
      .populate("auditedBy", "name")
      .sort({ createdAt: -1 });

    // Enrich dengan donation stats
    const causesReport = await Promise.all(
      causes.map(async (cause) => {
        const donations = await Donation.find({ cause: cause._id });
        const verifiedDonations = donations.filter(
          (d) => d.status === "verified"
        );
        const totalReceived = verifiedDonations.reduce(
          (sum, d) => sum + d.amount,
          0
        );
        const totalDisbursed = donations
          .filter((d) => d.distributionStatus === "distributed" || d.distributionStatus === "used")
          .reduce((sum, d) => sum + d.amount, 0);

        return {
          _id: cause._id,
          title: cause.title,
          category: cause.category,
          createdBy: cause.createdBy,
          totalReceived,
          totalDisbursed,
          remainingAmount: totalReceived - totalDisbursed,
          disbursementPercentage:
            totalReceived > 0
              ? Math.round((totalDisbursed / totalReceived) * 100)
              : 0,
          auditStatus: cause.auditStatus,
          auditedBy: cause.auditedBy,
          auditedAt: cause.auditedAt,
          auditNotes: cause.auditNotes,
          donationCount: donations.length,
          verifiedDonationCount: verifiedDonations.length,
        };
      })
    );

    // Calculate statistics
    const totalAmount = causesReport.reduce(
      (sum, c) => sum + c.totalReceived,
      0
    );
    const verifiedCount = causesReport.filter(
      (c) => c.auditStatus === "audit_verified"
    ).length;
    const flaggedCount = causesReport.filter(
      (c) => c.auditStatus === "audit_flagged"
    ).length;
    const pendingCount = causesReport.filter(
      (c) => c.auditStatus === "pending_audit"
    ).length;

    const distributedAmount = causesReport.reduce(
      (sum, c) => sum + c.totalDisbursed,
      0
    );

    const reportData = {
      summary: {
        totalPrograms: causesReport.length,
        totalAmount,
        verifiedCount,
        flaggedCount,
        pendingCount,
        distributedAmount,
        remainingAmount: totalAmount - distributedAmount,
      },
      causes: causesReport,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        category: category || null,
        auditStatus: auditStatus || null,
      },
      generatedAt: new Date(),
      generatedBy: {
        name: req.user.name,
        email: req.user.email,
      },
    };

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error("Error generating audit report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating audit report",
      error: error.message,
    });
  }
};
