// routes/notificationRoutes.js
import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middlewares/auth.js";

const notificationRoutes = express.Router();

notificationRoutes.get("/", protect, async (req, res) => {
  try {
    const { userId } = await req.auth();
    const notifs = await Notification.find({ user: String(userId) }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, notifications: notifs });
  } catch (err) {
    console.error("GET /api/notifications", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

notificationRoutes.post("/:id/read", protect, async (req, res) => {
  try {
    const { userId } = await req.auth();
    const id = req.params.id;
    await Notification.findOneAndUpdate({ _id: id, user: String(userId) }, { read: true });
    return res.json({ success: true });
  } catch (err) {
    console.error("POST /api/notifications/:id/read", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default notificationRoutes;
