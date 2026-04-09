import bcrypt from "bcrypt";
import { encrypt } from "../utils/encryption.js";
import jwt from "jsonwebtoken";
import {
  findUserByEmail as _findUserByEmail,
  findUserById as _findUserById,
  updateRefreshToken,
  incrementFailedLoginAttempts,
  lockUserAccount,
  resetFailedLoginAttempts,
} from "../model/repository.js";
import { formatUserResponse } from "./user-controller.js";
import { isTokenBlacklisted } from "../services/tokenBlacklistService.js";

export async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email and/or password" });
  }

  try {
    const encryptedEmail = encrypt(email.toLowerCase());
    const user = await _findUserByEmail(encryptedEmail);

    if (!user) {
      return res.status(401).json({ message: "Wrong email and/or password" });
    }

    // ============================================
    // STEP A: Check if the account is locked
    // ============================================
    if (user.lockUntil && user.lockUntil > new Date()) {
      // Account is still locked — calculate remaining time
      const remainingMs = user.lockUntil - new Date();
      const remainingMins = Math.ceil(remainingMs / (60 * 1000));

      return res.status(403).json({
        message: `Account is locked. Try again in ${remainingMins} minute(s).`,
      });
    }

    // If lockUntil has passed (expired), we allow the attempt.
    // The lock has "expired" naturally, so we continue normally.

    // ============================================
    // STEP B: Check the password
    // ============================================
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // ==========================================
      // STEP C: Wrong password — increment counter
      // ==========================================
      const updatedUser = await incrementFailedLoginAttempts(user.id);

      // Check if we need to also account for a previously expired lock.
      // updatedUser.failedLoginAttempts now has the NEW count (after +1).
      const attempts = updatedUser.failedLoginAttempts;
      const attemptsRemaining = 5 - attempts;

      if (attempts >= 5) {
        // Lock the account!
        await lockUserAccount(user.id);
        return res.status(403).json({
          message: "Too many failed attempts. Account locked for 15 minutes.",
        });
      }

      return res.status(401).json({
        message: `Wrong email and/or password. ${attemptsRemaining} attempt(s) remaining before lockout.`,
      });
    }

    // ============================================
    // STEP D: Password correct — reset everything
    // ============================================
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await resetFailedLoginAttempts(user.id);
    }

    // Generate tokens (your existing code)
    const accessToken = jwt.sign(
      {
        id: user.id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "5m",
      }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await updateRefreshToken(user.id, refreshToken);

    return res.status(200).json({
      message: "User logged in",
      data: {
        accessToken,
        refreshToken,
        ...formatUserResponse(user),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function handleVerifyToken(req, res) {
  try {
    const verifiedUser = req.user;
    return res.status(200).json({ message: "Token verified", data: verifiedUser });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function handleRefreshToken(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await _findUserById(payload.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const blacklisted = await isTokenBlacklisted(user.id, payload.iat);
    if (blacklisted) {
      return res.status(401).json({
        message: "Session invalidated due to privilege change. Please log in again.",
        code: "PRIVILEGE_CHANGED",
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    const newRefreshToken = jwt.sign({
      id: user.id
    }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d"
    });

    await updateRefreshToken(user.id, newRefreshToken);

    return res.status(200).json({ data: { accessToken: accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}