const TransparencyReport = require("../models/TransparencyReport");
const Cause = require("../models/Cause");
const { cloudinary } = require("../config/cloudinary");

// @desc    Create new transparency report
// @route   POST /api/transparency
// @access  Private/Admin
exports.createReport = async (req, res) => {
  try {
    const { causeId, amount, date, description, status } = req.body;

    // Validate cause exists
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    // Calculate remaining funds
    const remainingFunds = cause.currentAmount - cause.disbursedAmount;

    // Validate amount doesn't exceed remaining funds
    if (amount > remainingFunds) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds remaining funds. Available: Rp ${remainingFunds.toLocaleString()}`,
      });
    }

    // Handle file uploads (photos and documents)
    const photos = [];
    const documents = [];

    if (req.files) {
      // Process photos
      if (req.files.photos) {
        for (const file of req.files.photos) {
          photos.push({
            url: file.path,
            publicId: file.filename,
          });
        }
      }

      // Process documents
      if (req.files.documents) {
        for (const file of req.files.documents) {
          const fileType = file.mimetype.includes("pdf") ? "pdf" : "image";
          documents.push({
            url: file.path,
            publicId: file.filename,
            fileName: file.originalname,
            fileType: fileType,
          });
        }
      }
    }

    // Create report
    const report = await TransparencyReport.create({
      cause: causeId,
      amount,
      date: date || Date.now(),
      description,
      photos,
      documents,
      status: status || "draft",
      createdBy: req.user._id,
    });

    // If published, update cause disbursedAmount
    if (status === "published") {
      cause.disbursedAmount += amount;
      await cause.save();
    }

    const populatedReport = await TransparencyReport.findById(report._id)
      .populate("cause", "title targetAmount currentAmount disbursedAmount")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Transparency report created successfully",
      data: populatedReport,
    });
  } catch (error) {
    console.error("Error creating transparency report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create report",
      error: error.message,
    });
  }
};

// @desc    Get all reports for a cause
// @route   GET /api/transparency/cause/:causeId
// @access  Public
exports.getReportsByCause = async (req, res) => {
  try {
    const { causeId } = req.params;
    const { status } = req.query;

    // Build query
    const query = { cause: causeId };

    // Only show published reports to public (unless admin)
    if (!req.user || req.user.role !== "admin") {
      query.status = "published";
    } else if (status) {
      query.status = status;
    }

    const reports = await TransparencyReport.find(query)
      .sort({ date: -1 })
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    // Calculate total disbursed from reports
    const totalDisbursed = reports.reduce(
      (sum, report) => sum + report.amount,
      0
    );

    res.status(200).json({
      success: true,
      count: reports.length,
      totalDisbursed,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};

// @desc    Get single report by ID
// @route   GET /api/transparency/:id
// @access  Private/Admin
exports.getReportById = async (req, res) => {
  try {
    const report = await TransparencyReport.findById(req.params.id)
      .populate("cause", "title targetAmount currentAmount disbursedAmount")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error.message,
    });
  }
};

// @desc    Update transparency report
// @route   PUT /api/transparency/:id
// @access  Private/Admin
exports.updateReport = async (req, res) => {
  try {
    const { amount, date, description, status } = req.body;

    let report = await TransparencyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const cause = await Cause.findById(report.cause);
    const oldAmount = report.amount;
    const wasPublished = report.status === "published";

    // Validate new amount if changed
    if (amount && amount !== oldAmount) {
      const remainingFunds =
        cause.currentAmount -
        cause.disbursedAmount +
        (wasPublished ? oldAmount : 0);

      if (amount > remainingFunds) {
        return res.status(400).json({
          success: false,
          message: `Amount exceeds remaining funds. Available: Rp ${remainingFunds.toLocaleString()}`,
        });
      }
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.photos) {
        for (const file of req.files.photos) {
          report.photos.push({
            url: file.path,
            publicId: file.filename,
          });
        }
      }

      if (req.files.documents) {
        for (const file of req.files.documents) {
          const fileType = file.mimetype.includes("pdf") ? "pdf" : "image";
          report.documents.push({
            url: file.path,
            publicId: file.filename,
            fileName: file.originalname,
            fileType: fileType,
          });
        }
      }
    }

    // Update fields
    if (amount) report.amount = amount;
    if (date) report.date = date;
    if (description) report.description = description;

    // Handle status change
    if (status && status !== report.status) {
      if (status === "published" && !wasPublished) {
        // Publishing for first time
        cause.disbursedAmount += report.amount;
        await cause.save();
      } else if (status === "draft" && wasPublished) {
        // Unpublishing
        cause.disbursedAmount -= report.amount;
        await cause.save();
      }
      report.status = status;
    }

    // Handle amount change for already published reports
    if (amount && amount !== oldAmount && wasPublished) {
      const difference = amount - oldAmount;
      cause.disbursedAmount += difference;
      await cause.save();
    }

    report.updatedBy = req.user._id;
    await report.save();

    const updatedReport = await TransparencyReport.findById(report._id)
      .populate("cause", "title targetAmount currentAmount disbursedAmount")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: updatedReport,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update report",
      error: error.message,
    });
  }
};

// @desc    Delete transparency report
// @route   DELETE /api/transparency/:id
// @access  Private/Admin
exports.deleteReport = async (req, res) => {
  try {
    const report = await TransparencyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Delete files from Cloudinary
    for (const photo of report.photos) {
      if (photo.publicId) {
        await cloudinary.uploader.destroy(photo.publicId);
      }
    }

    for (const doc of report.documents) {
      if (doc.publicId) {
        await cloudinary.uploader.destroy(doc.publicId);
      }
    }

    // If report was published, subtract from cause disbursedAmount
    if (report.status === "published") {
      const cause = await Cause.findById(report.cause);
      if (cause) {
        cause.disbursedAmount -= report.amount;
        await cause.save();
      }
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
};

// @desc    Delete attachment from report
// @route   DELETE /api/transparency/:id/attachment
// @access  Private/Admin
exports.deleteAttachment = async (req, res) => {
  try {
    const { attachmentId, type } = req.body; // type: 'photo' or 'document'

    const report = await TransparencyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (type === "photo") {
      const photo = report.photos.id(attachmentId);
      if (photo && photo.publicId) {
        await cloudinary.uploader.destroy(photo.publicId);
      }
      report.photos.pull(attachmentId);
    } else if (type === "document") {
      const doc = report.documents.id(attachmentId);
      if (doc && doc.publicId) {
        await cloudinary.uploader.destroy(doc.publicId);
      }
      report.documents.pull(attachmentId);
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete attachment",
      error: error.message,
    });
  }
};

// @desc    Get all reports (admin only)
// @route   GET /api/transparency
// @access  Private/Admin
exports.getAllReports = async (req, res) => {
  try {
    const { status, causeId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (causeId) query.cause = causeId;

    const reports = await TransparencyReport.find(query)
      .sort({ createdAt: -1 })
      .populate("cause", "title category")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching all reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};
