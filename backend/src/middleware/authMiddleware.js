import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Not authorized, token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key",
    );

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(401).json({
      error: "Not authorized, token failed.",
    });
  }
};

