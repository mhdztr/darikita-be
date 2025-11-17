const Cause = require("../models/Cause");

// @desc    Get all causes
// @route   GET /api/causes
// @access  Public
exports.getCauses = async (req, res) => {
  try {
    const { category, status } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    const causes = await Cause.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: causes.length,
      data: causes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching causes",
      error: error.message,
    });
  }
};

// @desc    Get single cause
// @route   GET /api/causes/:id
// @access  Public
exports.getCause = async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    res.json({
      success: true,
      data: cause,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cause",
      error: error.message,
    });
  }
};

// @desc    Create new cause
// @route   POST /api/causes
// @access  Private/Admin
// ⭐ UPDATED: Added image upload support
exports.createCause = async (req, res) => {
  try {
    const { title, description, category, targetAmount, deadline, image } =
      req.body;

    // Check if image was uploaded via multer (from form-data)
    let imageUrl = image; // Use provided URL as fallback
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL from uploaded file
    }

    const cause = await Cause.create({
      title,
      description,
      category,
      targetAmount,
      deadline,
      image: imageUrl,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Cause created successfully",
      data: cause,
    });
  } catch (error) {
    console.error("Error creating cause:", error);
    res.status(500).json({
      success: false,
      message: "Error creating cause",
      error: error.message,
    });
  }
};

// @desc    Update cause
// @route   PUT /api/causes/:id
// @access  Private/Admin
// ⭐ UPDATED: Added image upload support
exports.updateCause = async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    // Handle image update
    const updateData = { ...req.body };

    // If new image was uploaded, use the uploaded file path
    if (req.file) {
      updateData.image = req.file.path; // Cloudinary URL
    }
    // If no file uploaded but image URL provided in body, use that
    // If neither, keep existing image (don't update)

    const updatedCause = await Cause.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Cause updated successfully",
      data: updatedCause,
    });
  } catch (error) {
    console.error("Error updating cause:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cause",
      error: error.message,
    });
  }
};

// @desc    Delete cause
// @route   DELETE /api/causes/:id
// @access  Private/Admin
exports.deleteCause = async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    await cause.deleteOne();

    res.json({
      success: true,
      message: "Cause deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting cause",
      error: error.message,
    });
  }
};

// @desc    Update cause progress
// @route   POST /api/causes/:id/progress
// @access  Private/Admin
// ⭐ UPDATED: Added support for multiple image uploads in progress updates
exports.updateCauseProgress = async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);

    if (!cause) {
      return res.status(404).json({
        success: false,
        message: "Cause not found",
      });
    }

    const { description, images, status } = req.body;

    // Handle multiple uploaded images for progress update
    let imageUrls = images || [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path); // Array of Cloudinary URLs
    }

    const progressUpdate = {
      description,
      images: imageUrls,
      date: Date.now(),
      updatedBy: req.user.id,
    };

    cause.progressUpdates.push(progressUpdate);

    if (status) {
      cause.status = status;
    }

    await cause.save();

    res.json({
      success: true,
      message: "Progress update added successfully",
      data: cause,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({
      success: false,
      message: "Error updating progress",
      error: error.message,
    });
  }
};
