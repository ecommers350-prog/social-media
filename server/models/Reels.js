// backend/models/Reel.js (add the new fields)
import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    video_url: { type: String, required: true },
    caption: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shares_count: { type: Number, default: 0 },
    comments_count: { type: Number, default: 0 },    // new
    saved_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // new
  },
  { timestamps: true }
);

export default mongoose.model("Reel", reelSchema);
