const express = require("express");
const bcrypt = require("bcryptjs");
const { supabase } = require("../utils/supabase");
const { signAdminToken } = require("../utils/auth");
const { requireAdminAuth } = require("../middleware/require-admin-auth");
const { validateBody } = require("../validators/common");
const { loginSchema } = require("../validators/auth");
const rateLimit = require("express-rate-limit");
const router = express.Router();


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

router.post(
  "/login", loginLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.validatedBody;

      const normalizedEmail = String(email).trim().toLowerCase();

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!adminUser) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const passwordMatches = await bcrypt.compare(
        password,
        adminUser.password_hash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const token = signAdminToken(adminUser);

      res.json({
        success: true,
        token,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          fullName: adminUser.full_name || ""
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to login"
      });
    }
  }
);

router.get("/me", requireAdminAuth, async (req, res) => {
  res.json({
    success: true,
    adminUser: req.adminUser
  });
});


module.exports = router;