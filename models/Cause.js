const mongoose = require("mongoose");

const causeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a cause title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
      enum: [
        "pendidikan",
        "kesehatan",
        "sosial",
        "bencana",
        "lingkungan",
        "infrastruktur",
        "lainnya",
      ],
    },
    targetAmount: {
      type: Number,
      required: [true, "Please add target amount"],
      min: [0, "Target amount cannot be negative"],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Current amount cannot be negative"],
    },
    // ✨ NEW: Track total disbursed amount
    disbursedAmount: {
      type: Number,
      default: 0,
      min: [0, "Disbursed amount cannot be negative"],
    },
    image: {
      type: String,
      default: "default-cause.jpg",
    },
    images: [
      {
        type: String,
      },
    ],
    deadline: {
      type: Date,
      required: [true, "Please add a deadline"],
    },
    status: {
      type: String,
      enum: ["active", "completed", "closed"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    progressUpdates: [
      {
        description: {
          type: String,
          required: true,
        },
        images: [String],
        date: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    totalDonors: {
      type: Number,
      default: 0,
    },
    // ✨ AUDIT FIELDS - Track audit status per cause/program
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
      maxlength: [2000, "Audit notes cannot exceed 2000 characters"],
    },
    auditDocument: {
      type: String, // URL to PDF/Image from Cloudinary
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for progress percentage
causeSchema.virtual("progressPercentage").get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.round((this.currentAmount / this.targetAmount) * 100);
});

// ✨ NEW: Virtual for disbursement percentage
causeSchema.virtual("disbursementPercentage").get(function () {
  if (this.currentAmount === 0) return 0;
  return Math.round((this.disbursedAmount / this.currentAmount) * 100);
});

// Virtual for remaining amount
causeSchema.virtual("remainingAmount").get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

// ✨ NEW: Virtual for remaining disbursement
causeSchema.virtual("remainingDisbursement").get(function () {
  return Math.max(0, this.currentAmount - this.disbursedAmount);
});

// Virtual for days remaining
causeSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Ensure virtuals are included when converting to JSON
causeSchema.set("toJSON", { virtuals: true });
causeSchema.set("toObject", { virtuals: true });

// Index for better query performance
causeSchema.index({ category: 1, status: 1 });
causeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Cause", causeSchema);
