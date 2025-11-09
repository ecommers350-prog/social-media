import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

/**
 * PostCard - defensive: won't crash if `post` prop is missing/partial.
 * Props:
 * - post: object (expected)
 * - onDelete: optional callback (deletedPostId) => void
 */
const PostCard = ({ post, onDelete }) => {
  // Always call hooks at the top level
  const currentUser = useSelector((state) => state.user?.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  // safe accessors with defaults
  const content = post?.content ?? "";
  const postWithHashtags = content.replace(/(#\w+)/g, '<span class="text-indigo-600">$1</span>');
  const imageUrls = Array.isArray(post?.image_urls) ? post.image_urls : [];
  const initLikes = Array.isArray(post?.likes_count) ? post.likes_count : (post?.likes_count || []);
  const commentsCount = post?.comments_count ?? (post?.comments?.length ?? 0);
  const sharesCount = post?.shares_count ?? post?.shares ?? 0;

  const [likes, setLikes] = useState(initLikes);

  // defensive: if post is missing, render a non-crashing placeholder
  if (!post) {
    console.warn("PostCard rendered without `post` prop (undefined/null).");
    return (
      <div className="bg-white rounded-xl shadow p-4 w-full max-w-2xl">
        <div className="text-sm text-gray-500">Post data is unavailable.</div>
      </div>
    );
  }

  const handleLike = async () => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/post/like",
        { postId: post._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.success) {
        toast.success(data.message || "Updated like");
        setLikes((prev = []) => {
          if (!currentUser) return prev;
          if (prev.includes(currentUser._id)) {
            return prev.filter((id) => id !== currentUser._id);
          } else {
            return [...prev, currentUser._id];
          }
        });
      } else {
        toast.error(data?.message || "Couldn't update like");
      }
    } catch (error) {
      console.error("Like error:", error);
      toast.error(error?.message || "Failed to like post");
    }
  };

  const handleViewPost = () => navigate(`/post/${post._id}`);

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (!ok) return;

    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Candidate paths to try (covers singular/plural and delete variations)
    const candidatePaths = [
      `/api/post/${post._id}`,
      `/api/posts/${post._id}`,
      `/api/post/delete/${post._id}`,
      `/api/posts/delete/${post._id}`,
    ];

    for (const path of candidatePaths) {
      try {
        console.debug('Post delete attempt', { path });
        const response = await api.delete(path, { headers });

        const status = response?.status;
        const data = response?.data;

        if (status === 200 || status === 204 || data?.success) {
          toast.success(data?.message || 'Post deleted');
          setMenuOpen(false);
          if (typeof onDelete === 'function') onDelete(post._id);
          console.info('Deleted post via', path, { status, data });
          return;
        }

        // If server returned a non-success but not server error, show message and stop
        if (data && data.success === false && status < 500) {
          toast.error(data.message || 'Failed to delete post');
          console.warn('Delete returned non-success:', data, 'for', path);
          return;
        }
      } catch (err) {
        console.warn('Delete attempt failed for', path, err?.response || err?.message || err);

        // If 404, try the next candidate; otherwise handle or surface error
        const status = err?.response?.status;
        if (status === 404) {
          continue; // try next path
        }

        if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase()?.includes('timeout')) {
          toast.error('Request timed out. Please try again.');
          return;
        }

        if (!err?.response) {
          toast.error('No response from server. Check your connection and server status.');
          return;
        }

        const msg = err.response?.data?.message || err.message || 'Error deleting post';
        if (status === 401 || status === 403) {
          toast.error('Unauthorized. Please log in again.');
        } else {
          toast.error(msg);
        }
        return;
      }
    }

    // If we get here all candidates returned 404 or failed to delete
    toast.error('Post not found on server (404). Verify backend route and post id.');
  };

  const isOwner = currentUser && post.user && currentUser._id === post.user._id;

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl">
      {/* User Info */}
      <div className="flex items-start justify-between">
        <div
          onClick={() => post.user?._id && navigate("/profile/" + post.user._id)}
          className="inline-flex items-center gap-3 cursor-pointer"
        >
          <img
            src={post.user?.profile_picture}
            alt={post.user?.full_name || "avatar"}
            className="w-10 h-10 rounded-full shadow"
          />
          <div>
            <div className="flex items-center space-x-1">
              <span>{post.user?.full_name ?? "Unknown"}</span>
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-gray-500 text-sm">
              @{post.user?.username ?? "unknown"} · {moment(post.createdAt).fromNow()}
            </div>
          </div>
        </div>

        {/* three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((s) => !s)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="p-2 rounded-full hover:bg-gray-100"
            title="More"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-md z-40">
              <button
                onClick={() => {
                  handleViewPost();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                View Post
              </button>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {content ? (
        <div
          className="text-gray-800 text-sm whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: postWithHashtags }}
        />
      ) : null}

      {/* Images */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageUrls.map((img, index) => (
            <img
              src={img}
              key={index}
              className={`w-full h-48 object-cover rounded-lg ${imageUrls.length === 1 ? "col-span-2 h-auto" : ""}`}
              alt={`post media ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex items-center gap-4 text-gray-600 text-sm pt-2 border-t border-gray-300">
        <div className="flex items-center gap-2">
          <Heart
            className={`w-4 h-4 cursor-pointer ${likes.includes(currentUser?._id) ? "text-red-500 fill-red-500" : ""}`}
            onClick={handleLike}
            role="button"
            aria-label="Like post"
            title="Like"
          />
          <span>{likes.length}</span>
        </div>

        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleViewPost}
          role="button"
          aria-label="View comments"
          title="Comments"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentsCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          <span>{sharesCount}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
