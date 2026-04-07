const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAdminToken(adminUser) {
  return jwt.sign(
    {
      sub: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.full_name || ""
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
}

function verifyAdminToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAdminToken,
  verifyAdminToken
};