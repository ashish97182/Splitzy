export function validateRequest({ body, params } = {}) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of [["params", params], ["body", body]]) {
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        errors.push(...result.error.issues.map((issue) => ({
          field: [source, ...issue.path].filter(Boolean).join(".") || source,
          message: issue.message,
        })));
      } else {
        req[source] = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation failed.",
        details: errors,
      });
    }

    return next();
  };
}
