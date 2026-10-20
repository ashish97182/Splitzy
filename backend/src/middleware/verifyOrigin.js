const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function verifyOrigin(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get("origin");
    if (
      !stateChangingMethods.has(req.method)
      || !origin
      || allowedOrigins.includes(origin)
    ) {
      return next();
    }
    return res.status(403).json({ error: "Request origin is not allowed." });
  };
}
