require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { env } = require("./config/env");
const logger = require("./utils/logger");
const ordersRoute = require("./routes/orders");
const inquiriesRoute = require("./routes/inquiries");
const reservationsRoute = require("./routes/reservations");
const testimonialsRoute = require("./routes/testimonials");
const adminRoute = require("./routes/admin");
const tenantRoute = require("./routes/tenant");
const publicRoute = require("./routes/public");
const authRoute = require("./routes/auth");
const uploadRoute = require("./routes/upload");

const app = express();
//const PORT = 5000;
const PORT = env.port;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});


// (Optional: you imported rateLimit but not using yet)
// Example usage:
 const limiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: 100, // limit each IP
 });

//  const allowedOrigins = [
//   "http://localhost:5500",
//   "http://127.0.0.1:5500"
// ];
const allowedOrigins = [env.frontendUrl, env.adminUrl];

 app.use(limiter);

// Security & parsing middleware (added here)
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// app.set("trust proxy", 1); // enable in production behind trusted proxy


app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: false
  })
);

app.use(globalLimiter);



// app.get("/api/health", (req, res) => {
//   res.json({
//     success: true,
//     message: "Backend is running"
//   });
// });

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
    env: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/orders", ordersRoute);
app.use("/api/inquiries", inquiriesRoute);
app.use("/api/reservations", reservationsRoute);
app.use("/api/testimonials", testimonialsRoute);
app.use("/api/admin", adminRoute);
app.use("/api/tenant", tenantRoute);
app.use("/api/public", publicRoute);
app.use("/api/auth", authRoute);
app.use("/api/admin/upload", uploadRoute);

app.use((err, req, res, next) => {
  // console.error("Unhandled server error:", err);
logger.error("Unhandled server error", {
  message: err.message,
  stack: env.isDevelopment ? err.stack : undefined
});

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// app.listen(PORT, () => {
//   // console.log(`Server running on http://localhost:${PORT}`);
//   logger.info("Server started", {
//   port: PORT,
//   nodeEnv: env.nodeEnv
// });

// });

try {
  app.listen(PORT, () => {
    logger.info("Server started", {
      port: PORT,
      nodeEnv: env.nodeEnv
    });
  });
} catch (error) {
  logger.error("Server failed to start", {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
}
