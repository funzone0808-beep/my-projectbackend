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
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number(getEnv("PORT", "5000")),

  supabaseUrl: getRequiredEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),

  jwtSecret: getRequiredEnv("JWT_SECRET"),
  jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "7d"),

  frontendUrl: getEnv("FRONTEND_URL", "http://localhost:5500"),
  adminUrl: getEnv("ADMIN_URL", "http://localhost:5500"),

  isProduction: getEnv("NODE_ENV", "development") === "production",
  isDevelopment: getEnv("NODE_ENV", "development") === "development"
};

module.exports = { env };