const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cause: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cause",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Please add donation amount"],
      min: [1000, "Minimum donation is Rp 1.000"],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      maxlength: [500, "Message cannot be more than 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed", "expired"],
      default: "pending",
    },
    paymentToken: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    orderId: {
      type: String,
      unique: true,
    },
    paymentData: {
      type: mongoose.Schema.Types.Mixed,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    distributionStatus: {
      type: String,
      enum: ["pending", "distributed", "used"],
      default: "pending",
    },
    distributionProof: [
      {
        type: String, // URL to images/documents
      },
    ],
    distributionNote: {
      type: String,
      maxlength: [
        1000,
        "Distribution note cannot be more than 1000 characters",
      ],
    },
    distributedAt: {
      type: Date,
    },
    auditStatus: {
      type: String,
      enum: [
        "pending_audit",
        "audit_in_progress",
        "audit_verified",
        "audit_flagged",
      ],
      default: "pending_audit",
    },
    auditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    auditedAt: {
      type: Date,
    },
    auditNotes: {
      type: String,
      maxlength: [1000, "Audit notes cannot exceed 1000 characters"],
    },
    auditDocument: {
      type: String, // URL to PDF from Cloudinary
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique order ID before saving
donationSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = `DONATION-${this._id}`;
  }
  next();
});

// Index for better query performance
donationSchema.index({ user: 1, createdAt: -1 });
donationSchema.index({ cause: 1, status: 1 });
donationSchema.index({ orderId: 1 });

module.exports = mongoose.model("Donation", donationSchema);
