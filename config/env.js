function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: getEnv("NODE_ENV", "production"),
  port: Number(getEnv("PORT", "10000")),

  supabaseUrl: getRequiredEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),

  jwtSecret: getRequiredEnv("JWT_SECRET"),
  jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "7d"),

  frontendUrl: getEnv("FRONTEND_URL", "https://my-projectfrontend.funzone0808.workers.dev"),
  adminUrl: getEnv("ADMIN_URL", "https://my-projectfrontend.funzone0808.workers.dev"),
  notificationDeliveryEnabled:
    getEnv("NOTIFICATION_DELIVERY_ENABLED", "false") === "true",
  notificationDeliveryChannel: getEnv("NOTIFICATION_DELIVERY_CHANNEL", "internal"),
  notificationEmailFrom: getEnv("NOTIFICATION_EMAIL_FROM", ""),
  notificationEmailTo: getEnv("NOTIFICATION_EMAIL_TO", ""),
  notificationSmtpHost: getEnv("NOTIFICATION_SMTP_HOST", ""),
  notificationSmtpPort: Number(getEnv("NOTIFICATION_SMTP_PORT", "587")),
  notificationSmtpSecure:
    getEnv("NOTIFICATION_SMTP_SECURE", "false") === "true",
  notificationSmtpUser: getEnv("NOTIFICATION_SMTP_USER", ""),
  notificationSmtpPass: getEnv("NOTIFICATION_SMTP_PASS", ""),

  isProduction: getEnv("NODE_ENV", "development") === "production",
  isDevelopment: getEnv("NODE_ENV", "development") === "development"
};

module.exports = { env };
