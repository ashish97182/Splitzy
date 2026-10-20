export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON request body." });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body exceeds the 100kb limit." });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({ error: "Internal server error." });
}
