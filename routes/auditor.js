// backend/routes/auditor.js
const express = require("express");
const {
  getAuditorStats,
  getAllCausesForAudit,
  getCauseAuditDetail,
  markCauseAudited,
  getAuditLogs,
  generateAuditReport,
} = require("../controllers/auditorController");
const { protect } = require("../middleware/auth");
const { roleCheck } = require("../middleware/roleCheck");
const { logAudit } = require("../middleware/auditLogger");
const { uploadAuditDocument } = require("../config/cloudinary");

const router = express.Router();

router.use(protect);
router.use(roleCheck(["auditor"]));

router.get("/stats", getAuditorStats);
// ✨ Changed from /donations to /causes - audit per program, not per donor
router.get("/causes", getAllCausesForAudit);
router.get("/causes/:id", getCauseAuditDetail);

// ✨ Changed from /donations/:id/audit to /causes/:id/audit
router.put(
  "/causes/:id/audit",
  uploadAuditDocument.single("auditDocument"),
  logAudit("audit_report_verified", "Cause"),
  markCauseAudited
);

router.get("/logs", getAuditLogs);
router.get("/report", generateAuditReport);

module.exports = router;
