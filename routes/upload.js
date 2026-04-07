const express = require("express");
const multer = require("multer");
const path = require("path");
const { supabase } = require("../utils/supabase");
const { requireAdminAuth } = require("../middleware/require-admin-auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  }
});

function sanitizeFileName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

router.post(
  "/",
  requireAdminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const hotelSlug = String(req.body.hotelSlug || "shared").trim();
      const folder = String(req.body.folder || "misc").trim();

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      const ext = path.extname(file.originalname || "").toLowerCase();
      const baseName = path.basename(file.originalname || "file", ext);
      const safeName = sanitizeFileName(baseName);
      const uniqueName = `${Date.now()}-${safeName}${ext}`;
      const storagePath = `${hotelSlug}/${folder}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from("hotel-assets")
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("hotel-assets")
        .getPublicUrl(storagePath);

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        file: {
          originalName: file.originalname,
          path: storagePath,
          publicUrl: publicData.publicUrl
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload file"
      });
    }
  }
);

router.delete("/", requireAdminAuth, async (req, res) => {
  try {
    const storagePath = String(req.body.storagePath || "").trim();

    if (!storagePath) {
      return res.status(400).json({
        success: false,
        message: "storagePath is required"
      });
    }

    const { error } = await supabase.storage
      .from("hotel-assets")
      .remove([storagePath]);

    if (error) throw error;

    res.json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file"
    });
  }
});

module.exports = router;