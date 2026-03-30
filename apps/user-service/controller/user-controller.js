import bcrypt from "bcrypt";
import { encrypt, decrypt } from "../utils/encryption.js";
import { isValidObjectId } from "mongoose";
import {
  createUser as _createUser,
  deleteUserById as _deleteUserById,
  findAllUsers as _findAllUsers,
  findUserByEmail as _findUserByEmail,
  findUserById as _findUserById,
  findUserByUsername as _findUserByUsername,
  findUserByUsernameOrEmail as _findUserByUsernameOrEmail,
  updateUserById as _updateUserById,
  updateUserPrivilegeById as _updateUserPrivilegeById,
} from "../model/repository.js";
import AttemptModel from "../model/attempt-model.js";
import UserModel from "../model/user-model.js";
import { publishPrivilegeChange } from "../services/tokenBlacklistService.js";


export async function createUser(req, res) {
  try {
    const { username, email, password } = req.body;
    if (username && email && password) {
      const existingUser = await _findUserByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(409).json({ message: "username or email already exists" });
      }

      // Password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character" 
        });
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const encryptedEmail = encrypt(email.toLowerCase());
      const isAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
      const createdUser = await _createUser(username, encryptedEmail, hashedPassword, isAdmin);
      return res.status(201).json({
        message: `Created new user ${username} successfully`,
        data: formatUserResponse(createdUser),
      });
    } else {
      return res.status(400).json({ message: "username and/or email and/or password are missing" });
    }
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "username or email already exists" });
    }
    return res.status(500).json({ message: "Unknown error when creating new user!" });
  }
}

export async function getUser(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    } else {
      return res.status(200).json({ message: `Found user`, data: formatUserResponse(user) });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting user!" });
  }
}

export async function getAllUsers(req, res) {
  try {
    const users = await _findAllUsers();

    return res.status(200).json({ message: `Found users`, data: users.map(formatUserResponse) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting all users!" });
  }
}

export async function updateUser(req, res) {
  try {
    const { username, email, password, currentPassword } = req.body;

    if (!username && !email && !password) {
      return res.status(400).json({ message: "No field to update: username, email and password are all missing!" });
    }

    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    // Password update requires currentPassword verification
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to update password" });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    }

    // Username validation and uniqueness check
    if (username) {
      const existingUser = await _findUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    // Email validation
    if (email) {
      if (!email.includes("@")) {
        return res.status(400).json({ message: "Email must contain @" });
      }
      const encryptedEmail = encrypt(email.toLowerCase());
      const existingUser = await _findUserByEmail(encryptedEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    // Password validation
    let hashedPassword;
    if (password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character" });
      }
      const salt = bcrypt.genSaltSync(10);
      hashedPassword = bcrypt.hashSync(password, salt);
    }

    const encryptedEmail = email ? encrypt(email.toLowerCase()) : undefined;
    const updatedUser = await _updateUserById(userId, username, encryptedEmail, hashedPassword);
    return res.status(200).json({
      message: `Updated data for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Username or email already exists" });
    }
    return res.status(500).json({ message: "Unknown error when updating user!" });
  }
}

export async function updateUserPrivilege(req, res) {
  try {
    const { isAdmin } = req.body;

    if (isAdmin !== undefined) {
      const userId = req.params.id;
      if (!isValidObjectId(userId)) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }
      const user = await _findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }

      // Prevent admin from removing their own privilege
      if (req.user.id === userId && isAdmin === false) {
        return res.status(403).json({ message: "Admins cannot remove their own admin privilege" });
      }

      const oldIsAdmin = user.isAdmin;  // ✅ NEW: capture old privilege

      const updatedUser = await _updateUserPrivilegeById(userId, isAdmin === true);

      // 🔥 NEW: If privilege actually changed, invalidate their session
      if (oldIsAdmin !== (isAdmin === true)) {
        await publishPrivilegeChange(userId, oldIsAdmin, isAdmin === true);
      }

      return res.status(200).json({
        message: `Updated privilege for user ${userId}`,
        data: formatUserResponse(updatedUser),
      });
    } else {
      return res.status(400).json({ message: "isAdmin is missing!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user privilege!" });
  }
}

export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    // Prevent deleting the last admin account
    if (user.isAdmin) {
      const adminCount = await UserModel.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(403).json({ message: "Cannot delete the last admin account" });
      }
    }
    await _deleteUserById(userId);
    return res.status(200).json({ message: `Deleted user ${userId} successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when deleting user!" });
  }
}

export async function getUserAttempts(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
    const attempts = await AttemptModel.find({ userId }).sort({ attemptedAt: -1 });
    return res.status(200).json({ message: `Found attempts for user ${userId}`, data: attempts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting attempts!" });
  }
}

export function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: decrypt(user.email),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}
