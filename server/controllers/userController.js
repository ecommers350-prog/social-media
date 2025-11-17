// server/controllers/userController.js
import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import fs from "fs";

// Helper to safely get auth object
const getAuth = (req) => {
  if (typeof req.auth === "function") {
    try {
      return req.auth();
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Get User Data using userId
export const getUserData = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(auth.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("getUserData error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update User Data
export const updateUserData = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // IMPORTANT: guard req.body in case it's undefined
    const body = req.body || {};
    // If you expect fields from multipart/form-data (multer), they are available in body as strings.
    let { username, bio, location, full_name } = body;

    // Fetch current user
    const tempuser = await User.findById(auth.userId);
    if (!tempuser) return res.status(404).json({ success: false, message: "User not found" });

    // Keep existing username if not provided
    if (!username) username = tempuser.username;

    // If username changed, ensure uniqueness
    if (tempuser.username !== username) {
      const userExists = await User.findOne({ username });
      if (userExists) {
        // keep old username if taken
        username = tempuser.username;
      }
    }

    const updatedData = {
      username,
      bio,
      location,
      full_name,
    };

    // multer stores uploaded files on req.files (if configured)
    const profile = req.files?.profile && Array.isArray(req.files.profile) ? req.files.profile[0] : null;
    const cover = req.files?.cover && Array.isArray(req.files.cover) ? req.files.cover[0] : null;

    // Upload profile picture if present
    if (profile) {
      const buffer = fs.readFileSync(profile.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: profile.originalname || `profile-${Date.now()}`,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auth" },
          { format: "webp" },
          { width: "512" },
        ],
      });
      updatedData.profile_picture = url;

      // cleanup temp file
      try { fs.unlinkSync(profile.path); } catch (e) { /* ignore */ }
    }

    // Upload cover photo if present
    if (cover) {
      const buffer = fs.readFileSync(cover.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: cover.originalname || `cover-${Date.now()}`,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auth" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
      updatedData.cover_photo = url;

      // cleanup temp file
      try { fs.unlinkSync(cover.path); } catch (e) { /* ignore */ }
    }

    const user = await User.findByIdAndUpdate(auth.userId, updatedData, { new: true });
    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("updateUserData error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Find Users using username, email, location, name
export const discoverUsers = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { input } = req.body || {};
    // Allow empty input to return nothing instead of failing
    if (!input || typeof input !== "string") {
      return res.json({ success: true, users: [] });
    }

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    const filteredUsers = allUsers.filter((u) => String(u._id) !== String(auth.userId));

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("discoverUsers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Follow User
export const followUser = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Target id required" });

    const user = await User.findById(auth.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.following.map(String).includes(String(id))) {
      return res.json({ success: false, message: "You are already following this user" });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    if (toUser && !toUser.followers.map(String).includes(String(auth.userId))) {
      toUser.followers.push(auth.userId);
      await toUser.save();
    }

    res.json({ success: true, message: "Now you are following this user" });
  } catch (error) {
    console.error("followUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unfollow user
export const unfollowUser = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Target id required" });

    const user = await User.findById(auth.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.following = user.following.filter((u) => String(u) !== String(id));
    await user.save();

    const toUser = await User.findById(id);
    if (toUser) {
      toUser.followers = toUser.followers.filter((u) => String(u) !== String(auth.userId));
      await toUser.save();
    }

    res.json({ success: true, message: "You are no longer following this user" });
  } catch (error) {
    console.error("unfollowUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send Connection Request 
export const sendConnectionRequest = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Target id required" });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequest = await Connection.find({
      from_user_id: auth.userId,
      created_at: { $gt: last24Hours },
    });
    if (connectionRequest.length >= 20) {
      return res.json({
        success: false,
        message: "You have sent more than 20 connection requests in the last 24 hours",
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: auth.userId, to_user_id: id },
        { from_user_id: id, to_user_id: auth.userId },
      ],
    });

    if (!connection) {
      const newConnection = await Connection.create({
        from_user_id: auth.userId,
        to_user_id: id,
        status: "pending",
      });

      // send event (optional)
      try {
        await inngest.send({
          name: "app/connection-request",
          data: { connectionId: newConnection._id.toString() },
        });
      } catch (e) {
        console.warn("inngest.send failed:", e?.message || e);
      }

      return res.json({ success: true, message: "Connection request sent successfully" });
    } else if (connection && connection.status === "accepted") {
      return res.json({ success: false, message: "You are already connected with this user" });
    }

    return res.json({ success: false, message: "Connection request pending" });
  } catch (error) {
    console.error("sendConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User Connection
export const getUserConnections = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(auth.userId)
      .populate("connections")
      .populate("followers")
      .populate("following");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const connections = user.connections || [];
    const followers = user.followers || [];
    const following = user.following || [];

    const pendingConnections = (
      await Connection.find({ to_user_id: auth.userId, status: "pending" }).populate("from_user_id")
    ).map((connection) => connection.from_user_id);

    res.json({ success: true, connections, followers, following, pendingConnections });
  } catch (error) {
    console.error("getUserConnections error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Accept Connection Request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Target id required" });

    const connection = await Connection.findOne({ from_user_id: id, to_user_id: auth.userId });
    if (!connection) {
      return res.json({ success: false, message: "Connection not found" });
    }

    const user = await User.findById(auth.userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    if (!user.connections.map(String).includes(String(id))) {
      user.connections.push(id);
      await user.save();
    }

    const toUser = await User.findById(id);
    if (!toUser) return res.json({ success: false, message: "Target user not found" });

    if (!toUser.connections.map(String).includes(String(auth.userId))) {
      toUser.connections.push(auth.userId);
      await toUser.save();
    }

    connection.status = "accepted";
    await connection.save();

    res.json({ success: true, message: "Connection accepted successfully" });
  } catch (error) {
    console.error("acceptConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User Profile
export const getUserProfiles = async (req, res) => {
  try {
    // body might be undefined — guard it
    const body = req.body || {};
    const { profileId } = body;
    if (!profileId) return res.status(400).json({ success: false, message: "profileId required" });

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.json({ success: false, message: "Profile not found" });
    }
    const posts = await Post.find({ user: profileId }).populate("user");

    res.json({ success: true, profile, posts });
  } catch (error) {
    console.error("getUserProfiles error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
