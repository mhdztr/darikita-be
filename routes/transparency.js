const express = require("express");
const {
  createReport,
  getReportsByCause,
  getReportById,
  updateReport,
  deleteReport,
  deleteAttachment,
  getAllReports,
} = require("../controllers/transparencyController");
const { protect } = require("../middleware/auth");
const { roleCheck } = require("../middleware/roleCheck");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

const router = express.Router();

// Configure Cloudinary storage for transparency reports
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "darikita/transparency",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
    resource_type: "auto",
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload middleware for multiple files
const uploadFiles = upload.fields([
  { name: "photos", maxCount: 10 },
  { name: "documents", maxCount: 5 },
]);

// Public routes
router.get("/cause/:causeId", getReportsByCause);

// Protected routes (Admin only)
router.use(protect);
router.use(roleCheck(["admin"]));

router.get("/", getAllReports);
router.post("/", uploadFiles, createReport);
router.get("/:id", getReportById);
router.put("/:id", uploadFiles, updateReport);
router.delete("/:id", deleteReport);
router.delete("/:id/attachment", deleteAttachment);

module.exports = router;
