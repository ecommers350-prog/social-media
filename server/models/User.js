// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // you’re using string id (probably Clerk userId)
    email: { type: String, required: true },
    full_name: { type: String, required: true },
    username: { type: String, unique: true },
    bio: { type: String, default: "Hey there! I am using PingUp." },
    profile_picture: { type: String, default: "" },
    cover_photo: { type: String, default: "" },
    location: { type: String, default: "" },
    followers: [{ type: String, ref: "User" }],
    following: [{ type: String, ref: "User" }],
    connections: [{ type: String, ref: "User" }],

    // 🔹 presence field
    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// 🔹 virtual field for online status (NOT stored in DB)
userSchema.virtual("isOnline").get(function () {
  if (!this.lastActiveAt) return false;
  const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  return Date.now() - this.lastActiveAt.getTime() <= ONLINE_WINDOW_MS;
});

// 🔹 make sure virtuals show up in JSON / object form
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);

export default User;
