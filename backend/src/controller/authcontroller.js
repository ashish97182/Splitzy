import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

import {
  hashRefreshToken,
  refreshCookieOptions,
  REFRESH_TOKEN_MS,
} from "../utils/tokenUtils.js";

// ----------------------------------------------------
// POST /api/auth/register
// ----------------------------------------------------

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Please provide all required fields.",
      });
    }
    const existingUser = await prisma.users.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists with this email.",
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        avatar: "",
      },
    });
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};

// ----------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }
    const user = await prisma.users.findUnique({
      where: {
        normalizedEmail,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: "Invalid credentials.",
      });
    }

    // ------------------------------------------------
    // ACCESS TOKEN
    // ------------------------------------------------

    const accessToken = jwt.sign(
      {
        userId: user.id,
        tokenType: "access",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // ------------------------------------------------
    // REFRESH TOKEN
    // ------------------------------------------------

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tokenType: "refresh",
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Hash refresh token BEFORE storing it
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);

    // ------------------------------------------------
    // STORE HASHED REFRESH TOKEN
    // ------------------------------------------------

    await prisma.refresh_tokens.create({
      data: {
        token: refreshTokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // ------------------------------------------------
    // SET HTTP-ONLY COOKIE
    // ------------------------------------------------

    res.cookie("jwt", refreshToken, {
      ...refreshCookieOptions,
      maxAge: REFRESH_TOKEN_MS,
    });

    // ------------------------------------------------
    // RESPONSE
    // ------------------------------------------------

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};

// ----------------------------------------------------
// POST /api/auth/refresh
// ----------------------------------------------------

export const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies?.jwt;

  // ------------------------------------------------
  // 1. Check cookie
  // ------------------------------------------------

  if (!refreshToken) {
    return res.status(401).json({
      error: "Refresh token missing. Please log in again.",
    });
  }

  try {
    // ------------------------------------------------
    // 2. Verify refresh JWT
    // ------------------------------------------------

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (
      typeof decoded === "string" ||
      !decoded.userId ||
      decoded.tokenType !== "refresh"
    ) {
      return res.status(401).json({
        error: "Invalid refresh token.",
      });
    }

    // ------------------------------------------------
    // 3. Hash incoming refresh token
    // ------------------------------------------------

    const oldTokenHash = hashRefreshToken(refreshToken);

    // ------------------------------------------------
    // 4. Create new tokens
    // ------------------------------------------------

    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        tokenType: "refresh",
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        tokenType: "access",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const now = new Date();

    // ------------------------------------------------
    // 5. Rotate refresh token inside transaction
    // ------------------------------------------------

    const rotated = await prisma.$transaction(
      async (tx) => {
        // Find existing hashed refresh token
        const storedToken = await tx.refresh_tokens.findUnique({
          where: {
            token: oldTokenHash,
          },
        });

        // Token doesn't exist
        if (!storedToken) {
          return false;
        }

        // Token belongs to another user
        if (storedToken.userId !== decoded.userId) {
          return false;
        }

        // Token expired
        if (storedToken.expiresAt <= now) {
          return false;
        }

        // Delete old token
        const deleted = await tx.refresh_tokens.deleteMany({
          where: {
            id: storedToken.id,
            token: oldTokenHash,
          },
        });

        // Token was already consumed
        if (deleted.count !== 1) {
          return false;
        }

        // Store new hashed refresh token
        await tx.refresh_tokens.create({
          data: {
            token: newRefreshTokenHash,
            userId: decoded.userId,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
          },
        });

        return true;
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    // ------------------------------------------------
    // 6. Rotation failed
    // ------------------------------------------------

    if (!rotated) {
      return res.status(401).json({
        error: "Refresh token expired, revoked, or already used.",
      });
    }

    // ------------------------------------------------
    // 7. Replace cookie
    // ------------------------------------------------

    res.cookie("jwt", newRefreshToken, {
      ...refreshCookieOptions,
      maxAge: REFRESH_TOKEN_MS,
    });

    // ------------------------------------------------
    // 8. Send new access token
    // ------------------------------------------------

    return res.status(200).json({
      message: "Token refreshed successfully.",
      accessToken: newAccessToken,
    });
  } catch (error) {
    // JWT errors
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        error: "Invalid or expired refresh token. Please log in again.",
      });
    }

    console.error("Refresh token error:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};

// ----------------------------------------------------
// POST /api/auth/logout
// ----------------------------------------------------

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.jwt;

    if (refreshToken) {
      await prisma.refresh_tokens.deleteMany({
        where: {
          token: hashRefreshToken(refreshToken),
        },
      });
    }
    res.clearCookie("jwt", refreshCookieOptions);

    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};

export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete all refresh tokens belonging to this user
    await prisma.refresh_tokens.deleteMany({
      where: {
        userId: userId,
      },
    });

    // Clear refresh token cookie on the current device
    res.clearCookie("jwt", refreshCookieOptions);

    return res.status(200).json({
      message: "Logged out from all devices successfully.",
    });
  } catch (error) {
    console.error("Logout all devices error:", error.message);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};