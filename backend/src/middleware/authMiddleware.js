import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access token missing.",
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof decoded === "string" ||
      !decoded.userId ||
      decoded.tokenType !== "access"
    ) {
      return res.status(401).json({
        error: "Invalid access token.",
      });
    }

    req.user = { userId: decoded.userId };

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        error: "Invalid or expired access token.",
      });
    }

    console.error("Authentication configuration error:", error.message);

    return res.status(500).json({
      error: "Authentication service unavailable.",
    });
  }
};
