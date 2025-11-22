// routes/postCommentsRoutes.js
import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { protect } from "../middlewares/auth.js"; // your existing protect

const router = express.Router();

/**
 * GET /api/post/:id/comments
 * Returns { comments: [...] } newest-first
 */
router.get("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: "Invalid post id" });
    }

    const post = await Post.findById(postId).select("comments").lean();
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // newest-first already if you inserted with unshift; sort to be safe
    const comments = Array.isArray(post.comments)
      ? post.comments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];

    return res.json({ success: true, comments });
  } catch (err) {
    console.error("GET /api/post/:id/comments error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /api/post/:id/comments
 * Body: { text }
 * Saves comment in DB and creates a notification for the post owner.
 */
router.post("/:id/comments", protect, async (req, res) => {
  try {
    // protect middleware guarantees req.auth exists; get the authenticated user id
    const { userId } = await req.auth();

    const postId = req.params.id;
    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "text required" });
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: "Invalid post id" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // load commenter info for snapshot (safe fallback if user doc missing)
    let userDoc = null;
    try {
      userDoc = await User.findById(userId).select("full_name profile_picture username").lean();
    } catch (e) {
      userDoc = null;
    }

    const comment = {
      user: {
        _id: String(userId),
        full_name: userDoc?.full_name || "User",
        avatar: userDoc?.profile_picture || null,
        username: userDoc?.username || null,
      },
      text,
      createdAt: new Date(),
    };

    // add to beginning to keep newest-first
    post.comments = post.comments || [];
    post.comments.unshift(comment);

    // keep numeric counter in sync
    post.comments_count = post.comments.length;

    await post.save();

    // create a notification for the post owner (but don't notify if commenter == owner)
    try {
      const ownerId = String(post.user);
      if (ownerId && ownerId !== String(userId)) {
        const notif = new Notification({
          user: ownerId,
          actor: {
            _id: String(userId),
            full_name: userDoc?.full_name || "User",
            avatar: userDoc?.profile_picture || null,
            username: userDoc?.username || null,
          },
          type: "comment",
          data: { postId: post._id, commentId: post.comments[0]._id, text },
          read: false,
        });
        await notif.save();
        // OPTIONAL: emit real-time socket event to notify owner (if you use socket.io)
        // e.g. io.to(ownerSocketId).emit('notification', notif);
      }
    } catch (notifErr) {
      console.warn("Failed to create notification", notifErr);
    }

    // Return the saved comment (including _id assigned by mongoose)
    return res.json({ success: true, comment: post.comments[0] });
  } catch (err) {
    console.error("POST /api/post/:id/comments error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
