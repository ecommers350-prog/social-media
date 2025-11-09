// backend/routes/reelRoutes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import Reel from "../models/Reel.js";
import Comment from "../models/Comment.js";

const router = express.Router();

// ... existing GET /, GET /:id, POST /like, POST /share (keep existing) ...

// GET /api/reels/:id/comments?page=1&limit=20
router.get("/:id/comments", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ reel: req.params.id })
      .populate("user", "full_name username profile_picture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({ reel: req.params.id });

    res.json({ success: true, comments, total });
  } catch (err) {
    console.error("Fetch comments error:", err);
    res.status(500).json({ success: false, message: "Error fetching comments" });
  }
});

// POST /api/reel/comment
router.post("/comment", verifyToken, async (req, res) => {
  try {
    const { reelId, content } = req.body;
    if (!content || !reelId) return res.status(400).json({ success: false, message: "Missing content or reelId" });

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

    const comment = await Comment.create({
      reel: reelId,
      user: req.user.id,
      content: content.trim(),
    });

    // increment comments_count on reel
    reel.comments_count = (reel.comments_count || 0) + 1;
    await reel.save();

    // populate returned comment user field
    await comment.populate("user", "full_name username profile_picture");

    res.json({ success: true, comment, comments_count: reel.comments_count });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ success: false, message: "Error adding comment" });
  }
});

// POST /api/reel/save  (toggle save/bookmark)
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { reelId } = req.body;
    if (!reelId) return res.status(400).json({ success: false, message: "Missing reelId" });

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

    const userId = req.user.id;
    const alreadySaved = (reel.saved_by || []).some((id) => id.toString() === userId);

    if (alreadySaved) {
      reel.saved_by = reel.saved_by.filter((id) => id.toString() !== userId);
    } else {
      reel.saved_by.push(userId);
    }
    await reel.save();

    res.json({ success: true, saved: !alreadySaved, saved_count: reel.saved_by.length });
  } catch (err) {
    console.error("Save toggle error:", err);
    res.status(500).json({ success: false, message: "Error toggling save" });
  }
});

export default router;
