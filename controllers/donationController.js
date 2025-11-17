const Donation = require("../models/Donation");
const Cause = require("../models/Cause");
const User = require("../models/User");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// @desc    Create donation and get Midtrans token
// @route   POST /api/donations
// @access  Private
exports.createDonation = async (req, res) => {
  try {
    const { causeId, amount, isAnonymous, message } = req.body;

    // Check if cause exists
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    // Create donation
    const donation = await Donation.create({
      user: req.user.id,
      cause: causeId,
      amount,
      isAnonymous: isAnonymous || false,
      message: message || "",
      status: "pending",
    });

    // Prepare Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: `DONATION-${donation._id}`,
        gross_amount: amount,
      },
      customer_details: {
        first_name: req.user.name,
        email: req.user.email,
      },
      item_details: [
        {
          id: causeId,
          price: amount,
          quantity: 1,
          name: `Donasi untuk ${cause.title}`,
        },
      ],
    };

    // Get Midtrans token
    const transaction = await snap.createTransaction(parameter);

    // Update donation with payment token
    donation.paymentToken = transaction.token;
    await donation.save();

    res.status(201).json({
      success: true,
      message: "Donation created successfully",
      data: {
        donation,
        paymentToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating donation",
      error: error.message,
    });
  }
};

// @desc    Get all donations
// @route   GET /api/donations
// @access  Private/Admin/Auditor
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find()
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

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
exports.getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate("user", "name email")
      .populate("cause", "title category targetAmount");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    // Check if user owns this donation or is admin/auditor
    if (
      donation.user._id.toString() !== req.user.id &&
      !["admin", "auditor"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this donation",
      });
    }

    res.json({
      success: true,
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching donation",
      error: error.message,
    });
  }
};

// @desc    Get user's donations
// @route   GET /api/donations/my-donations
// @access  Private
exports.getUserDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user.id })
      .populate("cause", "title category image")
      .sort({ createdAt: -1 });

    // Calculate total stats
    const totalDonations = donations.length;
    const totalAmount = donations
      .filter((d) => d.status === "verified")
      .reduce((sum, d) => sum + d.amount, 0);

    res.json({
      success: true,
      count: donations.length,
      data: donations,
      stats: {
        totalDonations,
        totalAmount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user donations",
      error: error.message,
    });
  }
};

// @desc    Verify donation payment
// @route   PUT /api/donations/:id/verify
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

    // Check if already verified
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
      await cause.save();
    }

    // Update user's total donations and amount
    const user = await User.findById(donation.user);
    if (user) {
      user.totalDonations += 1;
      user.totalAmount += donation.amount;
      await user.save();
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

// @desc    Update donation status (distributed/used)
// @route   PUT /api/donations/:id/status
// @access  Private/Admin
exports.updateDonationStatus = async (req, res) => {
  try {
    const { distributionStatus, distributionProof, distributionNote } =
      req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    donation.distributionStatus = distributionStatus;
    donation.distributionProof = distributionProof || [];
    donation.distributionNote = distributionNote || "";
    donation.distributedAt = Date.now();

    await donation.save();

    res.json({
      success: true,
      message: "Donation status updated successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating donation status",
      error: error.message,
    });
  }
};

// @desc    Get donation statistics
// @route   GET /api/donations/stats/overview
// @access  Private/Admin/Auditor
exports.getDonationStats = async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const verifiedDonations = await Donation.countDocuments({
      status: "verified",
    });
    const totalAmount = await Donation.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const distributedAmount = await Donation.aggregate([
      { $match: { distributionStatus: "distributed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalDonations,
        verifiedDonations,
        totalAmount: totalAmount[0]?.total || 0,
        distributedAmount: distributedAmount[0]?.total || 0,
        pendingAmount:
          (totalAmount[0]?.total || 0) - (distributedAmount[0]?.total || 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching donation statistics",
      error: error.message,
    });
  }
};
