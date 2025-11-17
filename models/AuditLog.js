const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // User actions
        "user_login",
        "user_logout",
        "user_role_changed",

        // Cause actions
        "cause_created",
        "cause_updated",
        "cause_deleted",
        "cause_status_changed",

        // Donation actions
        "donation_created",
        "donation_verified",
        "donation_status_changed",
        "donation_distributed",

        // Audit actions
        "audit_report_verified",
        "audit_report_flagged",
      ],
    },
    targetType: {
      type: String,
      enum: ["User", "Cause", "Donation", "TransparencyReport"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType",
    },
    changes: {
      type: mongoose.Schema.Types.Mixed, // Store before/after values
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      description: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
