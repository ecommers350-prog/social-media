// routes/connections.js
import express from "express";
import User from "../models/User.js";

const connectionsRouter = express.Router();

// how long we consider a user "online" since last activity
const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// small helper to shape user object + compute isOnline
const mapUserWithPresence = (u, now) => {
  if (!u) return null;

  const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
  const isOnline = lastActive && now - lastActive <= ONLINE_WINDOW_MS;

  return {
    _id: u._id,
    full_name: u.full_name,
    username: u.username,
    profile_picture: u.profile_picture,
    bio: u.bio,
    isOnline,
  };
};

/**
 * GET /api/user/connections
 * Returns followers, following, pendingConnections, connections
 * Each user has `isOnline` boolean
 */
connectionsRouter.get("/connections", async (req, res) => {
  try {
    const currentUserId = req.userId; // 🔐 must be set by your auth middleware

    if (!currentUserId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    // load current user with populated relations
    const me = await User.findById(currentUserId)
      .populate("followers", "full_name username profile_picture bio lastActiveAt")
      .populate("following", "full_name username profile_picture bio lastActiveAt")
      .populate("connections", "full_name username profile_picture bio lastActiveAt")
      // if you have a pending field, populate it here too:
      // .populate("pendingConnections", "full_name username profile_picture bio lastActiveAt")
      .lean();

    if (!me) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = Date.now();

    // make sure we always have arrays
    const followers = Array.isArray(me.followers) ? me.followers : [];
    const following = Array.isArray(me.following) ? me.following : [];
    const connections = Array.isArray(me.connections) ? me.connections : [];
    const pendingConnections = Array.isArray(me.pendingConnections)
      ? me.pendingConnections
      : []; // if you don't have this in schema, this will just be []

    const payload = {
      success: true,
      followers: followers.map((u) => mapUserWithPresence(u, now)),
      following: following.map((u) => mapUserWithPresence(u, now)),
      pendingConnections: pendingConnections.map((u) =>
        mapUserWithPresence(u, now)
      ),
      connections: connections.map((u) => mapUserWithPresence(u, now)),
    };

    return res.json(payload);
  } catch (err) {
    console.error("GET /api/user/connections error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

export default connectionsRouter;
