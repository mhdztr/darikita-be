// backend/routes/causes.js
const express = require("express");
const {
  getCauses,
  getCause,
  createCause,
  updateCause,
  deleteCause,
  updateCauseProgress,
} = require("../controllers/causeController");
const { protect } = require("../middleware/auth");
const { roleCheck } = require("../middleware/roleCheck");
const { uploadCauseImage } = require("../config/cloudinary"); // ✅ FIXED: Changed from upload to uploadCauseImage

const router = express.Router();

// Public routes
router.get("/", getCauses);
router.get("/:id", getCause);

// Protected routes - Admin only
router.post(
  "/",
  protect,
  roleCheck(["admin"]),
  uploadCauseImage.single("image"), // ✅ FIXED
  createCause
);

router.put(
  "/:id",
  protect,
  roleCheck(["admin"]),
  uploadCauseImage.single("image"), // ✅ FIXED
  updateCause
);

router.delete("/:id", protect, roleCheck(["admin"]), deleteCause);

router.post(
  "/:id/progress",
  protect,
  roleCheck(["admin"]),
  uploadCauseImage.array("images", 5), // ✅ FIXED
  updateCauseProgress
);

module.exports = router;
