// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  user: { type: String, ref: "User", required: true }, // who should receive this notification (the owner)
  actor: { // who triggered the notification (commenter)
    _id: { type: String },
    full_name: { type: String },
    avatar: { type: String },
    username: { type: String },
  },
  type: { type: String, enum: ["comment", "like", "follow", "share"], default: "comment" },
  data: { type: mongoose.Schema.Types.Mixed }, // optional payload (e.g. { postId, commentId, text })
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
