import bcrypt from "bcrypt";
import { encrypt } from "../utils/encryption.js";
import jwt from "jsonwebtoken";
import {
  findUserByEmail as _findUserByEmail,
  findUserById as _findUserById,
  updateRefreshToken,
} from "../model/repository.js";
import { formatUserResponse } from "./user-controller.js";

export async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const encryptedEmail = encrypt(email.toLowerCase());
      const user = await _findUserByEmail(encryptedEmail);
      if (!user) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }

      const accessToken = jwt.sign({
        id: user.id,
        isAdmin: user.isAdmin
      }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      const refreshToken = jwt.sign({
        id: user.id
      }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d"
      });

      await updateRefreshToken(user.id, refreshToken);

      return res.status(200).json({ message: "User logged in", data: { accessToken, refreshToken, ...formatUserResponse(user) } });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  } else {
    return res.status(400).json({ message: "Missing email and/or password" });
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