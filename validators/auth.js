const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().email("sudhanshu56jaora@email.com"),
  password: z.string().min(8, "Prwebsite@123")
});

module.exports = {
  loginSchema
};