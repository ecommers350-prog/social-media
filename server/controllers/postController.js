// controllers/postController.js
import fs from "fs";
import mongoose from "mongoose";
import imagekit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import User from "../models/User.js";

/**
 * Helper to extract authenticated user id
 * Supports both req.auth() (async) and req.user shape.
 */
async function getAuthenticatedUserId(req) {
  try {
    if (typeof req.auth === "function") {
      const auth = await req.auth();
      return auth?.userId || auth?.id || auth?.sub || auth?._id || null;
    }
  } catch (e) {
    // ignore
  }
  return req.user?.userId || req.user?._id || req.user?.id || req.userId || null;
}

/**
 * Add Post
 * - uploads images with imagekit if provided (req.files)
 * - saves post with image URLs
 */
export const addPost = async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const { content = "", post_type } = req.body;
    if (!post_type) return res.status(400).json({ success: false, message: "post_type required" });

    const images = Array.isArray(req.files) ? req.files : [];
    let image_urls = [];

    if (images.length) {
      // Upload each file to imagekit and produce a webp url (keeps your previous logic)
      image_urls = await Promise.all(
        images.map(async (image) => {
          // read local file buffer (works if multer saved file)
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer,
            fileName: image.originalname,
            folder: "posts",
          });

          // use imagekit url helper for transformation (if available)
          const url =
            typeof imagekit.url === "function"
              ? imagekit.url({
                  path: response.filePath,
                  transformation: [{ quality: "auth" }, { format: "webp" }, { width: "1280" }],
                })
              : response.url || response.fileUrl || response.filePath;

          return url;
        })
      );
    }

    const post = new Post({
      user: String(userId),
      content,
      image_urls,
      post_type,
      // keep compatibility with older field names
      likes_count: Array.isArray(req.body.likes_count) ? req.body.likes_count : [],
      comments: [],
      comments_count: 0,
    });

    await post.save();
    return res.json({ success: true, post });
  } catch (error) {
    console.error("addPost error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Get Feed Posts
 * - returns posts for user, their connections and following
 */
export const getFeedPost = async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // combine IDs (safe defaults)
    const userIds = [
      String(userId),
      ...(Array.isArray(user.connections) ? user.connections.map(String) : []),
      ...(Array.isArray(user.following) ? user.following.map(String) : []),
    ];

    const posts = await Post.find({ user: { $in: userIds } })
      .populate({ path: "user", select: "full_name profile_picture username" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, posts });
  } catch (error) {
    console.error("getFeedPost error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Like Post (toggle)
 * Accepts { postId } in body
 * Maintains backward-compatible `likes_count` array
 */
export const likePost = async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const postId = req.body?.postId || req.params?.id;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return res.status(400).json({ success: false, message: "Invalid post id" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // support both `likes` and legacy `likes_count`
    const arrField = Array.isArray(post.likes) ? "likes" : "likes_count";
    const list = Array.isArray(post[arrField]) ? post[arrField].map(String) : [];

    const exists = list.includes(String(userId));
    if (exists) {
      // remove
      post[arrField] = list.filter((id) => id !== String(userId));
      await post.save();
      return res.json({ success: true, message: "Post unliked", liked: false, count: post[arrField].length });
    } else {
      // add
      post[arrField] = [...list, String(userId)];
      await post.save();
      return res.json({ success: true, message: "Post liked", liked: true, count: post[arrField].length });
    }
  } catch (error) {
    console.error("likePost error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Delete Post
 * Only owner can delete
 */
export const deletePost = async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const postId = req.params.id || req.body.postId;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return res.status(400).json({ success: false, message: "Invalid post id" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (String(post.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(postId);
    return res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("deletePost error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Get Post Comments
 * GET /api/post/:id/comments
 */
export const getPostComments = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return res.status(400).json({ success: false, message: "Invalid post id" });

    const post = await Post.findById(postId).select("comments").lean();
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comments = Array.isArray(post.comments)
      ? post.comments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];

    return res.json({ success: true, comments });
  } catch (error) {
    console.error("getPostComments error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Add Post Comment
 * POST /api/post/:id/comments  { text }
 * Saves comment subdocument and updates comments_count
 */
export const addPostComment = async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const postId = req.params.id;
    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "text required" });
    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return res.status(400).json({ success: false, message: "Invalid post id" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // get user snapshot
    let userDoc = null;
    try {
      userDoc = await User.findById(String(userId)).select("full_name profile_picture username").lean();
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

    post.comments = post.comments || [];
    post.comments.unshift(comment);
    post.comments_count = post.comments.length;

    await post.save();

    // Optionally: create notification for owner here (not implemented)
    return res.json({ success: true, comment: post.comments[0] });
  } catch (error) {
    console.error("addPostComment error", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
