const Donation = require("../models/Donation");
const Cause = require("../models/Cause");
const crypto = require("crypto");

// @desc    Handle Midtrans notification/callback
// @route   POST /api/midtrans/notification
// @access  Public (called by Midtrans)
exports.handleNotification = async (req, res) => {
  try {
    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      gross_amount,
      signature_key,
    } = req.body;

    console.log("📩 Midtrans Notification:", req.body);

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const hash = crypto
      .createHash("sha512")
      .update(`${order_id}${transaction_status}${gross_amount}${serverKey}`)
      .digest("hex");

    if (hash !== signature_key) {
      console.log("❌ Invalid signature");
      return res.status(403).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // Get donation
    const donation = await Donation.findOne({ orderId: order_id });

    if (!donation) {
      console.log("❌ Donation not found");
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    // Update donation based on transaction status
    if (transaction_status === "capture") {
      if (fraud_status === "challenge") {
        donation.status = "pending";
      } else if (fraud_status === "accept") {
        donation.status = "verified";
        donation.verifiedAt = Date.now();
        await updateCauseAmount(donation);
      }
    } else if (transaction_status === "settlement") {
      donation.status = "verified";
      donation.verifiedAt = Date.now();
      await updateCauseAmount(donation);
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      donation.status = "failed";
    } else if (transaction_status === "pending") {
      donation.status = "pending";
    }

    // Save payment data
    donation.paymentMethod = payment_type;
    donation.transactionId = transaction_id;
    donation.paymentData = req.body;

    await donation.save();

    console.log(`✅ Donation ${order_id} updated to ${donation.status}`);

    res.json({
      success: true,
      message: "Notification processed",
    });
  } catch (error) {
    console.error("❌ Midtrans notification error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing notification",
      error: error.message,
    });
  }
};

// Helper function to update cause amount
async function updateCauseAmount(donation) {
  try {
    const cause = await Cause.findById(donation.cause);
    if (cause) {
      cause.currentAmount += donation.amount;
      cause.totalDonors += 1;
      await cause.save();
      console.log(`✅ Cause ${cause._id} updated: +Rp ${donation.amount}`);
    }
  } catch (error) {
    console.error("Error updating cause:", error);
  }
}
