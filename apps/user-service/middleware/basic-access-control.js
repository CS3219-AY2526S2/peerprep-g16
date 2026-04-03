import jwt from "jsonwebtoken";
import { findUserById as _findUserById } from "../model/repository.js";
import { isTokenBlacklisted } from "../services/tokenBlacklistService.js";
import { decrypt } from "../utils/encryption.js"; // ✅ import the decrypt util

export function verifyAccessToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  // Authorization: Bearer <access_token>
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    try {
      const blacklisted = await isTokenBlacklisted(decoded.id, decoded.iat);
      if (blacklisted) {
        return res.status(401).json({
          message: "Session invalidated due to privilege change. Please log in again.",
          code: "PRIVILEGE_CHANGED",
        });
      }

      const dbUser = await _findUserById(decoded.id);
      if (!dbUser) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        email: decrypt(dbUser.email),
        isAdmin: dbUser.isAdmin,
      };
      next();
    } catch (error) {
      console.error("Error in token verification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}

export function verifyIsAdmin(req, res, next) {
  if (req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ message: "Not authorized to access this resource" });
  }
}

export function verifyIsOwnerOrAdmin(req, res, next) {
  if (req.user.isAdmin) {
    return next();
  }

  const userIdFromReqParams = req.params.id;
  const userIdFromToken = req.user.id;
  if (userIdFromReqParams === userIdFromToken) {
    return next();
  }

  return res.status(403).json({ message: "Not authorized to access this resource" });
}
