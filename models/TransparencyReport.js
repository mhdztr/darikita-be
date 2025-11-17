const mongoose = require("mongoose");

const transparencyReportSchema = new mongoose.Schema(
  {
    cause: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cause",
      required: [true, "Cause is required"],
    },
    amount: {
      type: Number,
      required: [true, "Disbursement amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    date: {
      type: Date,
      required: [true, "Disbursement date is required"],
      default: Date.now,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    photos: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    documents: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
        },
        fileName: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          enum: ["pdf", "image"],
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
transparencyReportSchema.index({ cause: 1, createdAt: -1 });
transparencyReportSchema.index({ status: 1 });

module.exports = mongoose.model("TransparencyReport", transparencyReportSchema);
