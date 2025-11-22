// routes/message.js
import express from "express";
import Message from "../models/Message.js";
// import your auth middleware that sets req.userId

const messageRoutes = express.Router();

/**
 * POST /api/message/send
 * body: to_user_id, text?, replyTo?
 * file: image? (handled by multer if you use it)
 */
messageRoutes.post("/send", async (req, res) => {
  try {
    const from_user_id = req.userId;
    const { to_user_id, text, replyTo } = req.body;

    if (!from_user_id || !to_user_id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid users" });
    }

    let message_type = "text";
    let media_url = "";

    // if you use multer, you’d do something like:
    if (req.file) {
      message_type = "image";
      media_url = `/uploads/${req.file.filename}`; // adjust as needed
    }

    const msg = await Message.create({
      from_user_id,
      to_user_id,
      text: text || "",
      message_type,
      media_url,
      replyTo: replyTo || null,
    });

    // optional: populate replyTo to send back to client
    const populated = await Message.findById(msg._id)
      .populate("replyTo")
      .lean();

    return res.json({ success: true, message: populated });
  } catch (err) {
    console.error("POST /api/message/send error:", err);
    res
      .status(500)
      .json({ success: false, message: "Could not send message" });
  }
});

/**
 * GET /api/message/conversation/:userId
 * Return messages between logged in user and :userId, including replyTo
 */
messageRoutes.get("/conversation/:userId", async (req, res) => {
  try {
    const currentUserId = req.userId;
    const otherUserId = req.params.userId;

    if (!currentUserId || !otherUserId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ids" });
    }

    const msgs = await Message.find({
      $or: [
        { from_user_id: currentUserId, to_user_id: otherUserId },
        { from_user_id: otherUserId, to_user_id: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("replyTo") // so frontend can show replied content
      .lean();

    res.json({ success: true, messages: msgs });
  } catch (err) {
    console.error("GET /api/message/conversation error:", err);
    res
      .status(500)
      .json({ success: false, message: "Could not fetch messages" });
  }
});

/**
 * POST /api/message/delete
 * body: { id }
 * only sender can delete their message
 */
messageRoutes.post("/delete", async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Message id required" });
    }

    const msg = await Message.findById(id);
    if (!msg) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (String(msg.from_user_id) !== String(currentUserId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not allowed to delete" });
    }

    await Message.findByIdAndDelete(id);

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("POST /api/message/delete error:", err);
    res
      .status(500)
      .json({ success: false, message: "Could not delete message" });
  }
});

export default messageRoutes;
