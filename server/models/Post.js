// models/Post.js
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    user: {
      _id: { type: String, required: true }, // store user id as string
      full_name: { type: String },
      avatar: { type: String },
      username: { type: String },
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    user: { type: String, ref: "User", required: true }, // owner id (string)
    content: { type: String, default: "" },
    image_urls: [{ type: String }],
    post_type: { type: String, enum: ["text", "image", "text_with_image"], required: true },

    // canonical fields
    likes: [{ type: String, ref: "User" }], // array of user ids who liked
    comments: { type: [CommentSchema], default: [] },
    comments_count: { type: Number, default: 0 },
    shares_count: { type: Number, default: 0 },

    // keep legacy field for compatibility with older code
    likes_count: [{ type: String, ref: "User" }],
  },
  { timestamps: true, minimize: false }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
