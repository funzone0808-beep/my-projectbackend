const { ZodError } = require("zod");

function formatZodError(error) {
  if (!(error instanceof ZodError)) {
    return ["Invalid request data"];
  }

  return error.issues.map((issue) => {
    const path = issue.path?.length ? issue.path.join(".") : "field";
    return `${path}: ${issue.message}`;
  });
}

// Middleware factory
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodError(error)
      });
    }
  };
}

module.exports = {
  validateBody,
  formatZodError
};