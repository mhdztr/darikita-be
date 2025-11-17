// backend/config/cloudinary.js
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 1. Storage untuk cause images (Biarkan saja)
const causeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "darikita/causes",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});

// 2. Storage untuk audit documents (INI YANG DIGANTI)
const auditStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    console.log("--- UPLOAD AUDIT DIMULAI ---");
    console.log("Original filename:", file.originalname);
    console.log("Mimetype file:", file.mimetype);

    let resourceType;
    let public_id;

    // Ambil nama asli dan ekstensinya
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname); // --> .pdf atau .jpg

    if (file.mimetype === "application/pdf") {
      resourceType = "raw";
      // UNTUK TIPE RAW, public_id HARUS MENGANDUNG EKSTENSI
      // Kita buat unik dengan timestamp
      public_id = `${originalName}_${Date.now()}${extension}`; // --> nama_file_12345.pdf
    } else {
      resourceType = "image";
      // UNTUK TIPE IMAGE, public_id TIDAK PERLU EKSTENSI
      public_id = `${originalName}_${Date.now()}`; // --> nama_file_12345
    }

    console.log("Resource Type di-set ke:", resourceType);
    console.log("Public ID di-set ke:", public_id);

    return {
      folder: "darikita/audit-documents",
      resource_type: resourceType,
      public_id: public_id, // Kita set public_id secara manual
      // Hapus unique_filename dan use_filename karena sudah dihandle
    };
  },
});

// 3. Uploader untuk cause images (Biarkan saja)
const uploadCauseImage = multer({
  storage: causeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// 4. Uploader untuk audit documents (Pastikan ini benar)
const uploadAuditDocument = multer({
  storage: auditStorage, // Pastikan ini menunjuk ke auditStorage (poin 2)
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"), false);
    }
  },
});

module.exports = {
  cloudinary,
  uploadCauseImage,
  uploadAuditDocument,
};