import UserModel from "./user-model.js";
import "dotenv/config";
import { connect } from "mongoose";

export async function connectToDB() {
  let mongoDBUri =
    process.env.ENV === "PROD"
      ? process.env.DB_CLOUD_URI
      : process.env.DB_LOCAL_URI;

  await connect(mongoDBUri);
}

export async function createUser(username, email, password, isAdmin = false) {
  return new UserModel({ username, email, password, isAdmin }).save();
}

export async function findUserByEmail(email) {
  return UserModel.findOne({ email });
}

export async function findUserById(userId) {
  return UserModel.findById(userId);
}

export async function findUserByUsername(username) {
  return UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
}

export async function findUserByUsernameOrEmail(username, email) {
  return UserModel.findOne({
    $or: [
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { email },
    ],
  });
}

export async function findAllUsers() {
  return UserModel.find();
}

export async function updateUserById(userId, username, email, password) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        username,
        email,
        password,
      },
    },
    { new: true },  // return the updated user
  );
}

export async function updateUserPrivilegeById(userId, isAdmin) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isAdmin,
      },
    },
    { new: true },  // return the updated user
  );
}

export async function deleteUserById(userId) {
  return UserModel.findByIdAndDelete(userId);
}

export async function updateRefreshToken(userId, refreshToken) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { refreshToken } },
    { new: true }
  );
}

// to increment failed login attempts
export async function incrementFailedLoginAttempts(userId) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $inc: { failedLoginAttempts: 1 }, // $inc adds 1 to the current value
    },
    { new: true } // return the updated user so we can check the new count
  );
}

// to lock the account for 15 minutes
export async function lockUserAccount(userId) {
  const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        lockUntil: lockUntil,
        failedLoginAttempts: 0, // reset the counter after locking
      },
    },
    { new: true }
  );
}

// to reset failed attempts on successful login
export async function resetFailedLoginAttempts(userId) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    },
    { new: true }
  );
}
