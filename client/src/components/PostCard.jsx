// src/components/PostCard.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  X,
  SendHorizonal,
} from "lucide-react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

/**
 * PostCard - Instagram / YouTube-like mobile theme
 */
const PostCard = ({ post, onDelete, onUpdate }) => {
  const currentUser = useSelector((s) => s.user?.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Defensive defaults for post-derived values
  const safePost = post || {};
  const imageUrls = Array.isArray(safePost.image_urls) ? safePost.image_urls : [];
  const initialLikes = Array.isArray(safePost.likes)
    ? safePost.likes
    : Array.isArray(safePost.likes_count)
    ? safePost.likes_count
    : [];
  const initialCommentsCount = Number(
    safePost.comments_count ??
      (Array.isArray(safePost.comments) ? safePost.comments.length : 0)
  );
  const initialSharesCount = Number(safePost.shares_count ?? safePost.shares ?? 0);

  const [likes, setLikes] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [sharesCount, setSharesCount] = useState(initialSharesCount);

  // refs for comments sheet
  const sheetRef = useRef(null);
  const composerRef = useRef(null);

  // ---------- Hooks ----------

  // close menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  // keep local state in sync if the post prop changes
  useEffect(() => {
    setLikes(
      Array.isArray(safePost.likes)
        ? safePost.likes
        : Array.isArray(safePost.likes_count)
        ? safePost.likes_count
        : []
    );
    setCommentsCount(
      Number(
        safePost.comments_count ??
          (Array.isArray(safePost.comments)
            ? safePost.comments.length
            : commentsCount)
      )
    );
    setSharesCount(
      Number(safePost.shares_count ?? safePost.shares ?? sharesCount)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?._id]);

  // load comments when panel opens
  useEffect(() => {
    if (!commentsOpen || !post?._id) return;

    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      try {
        let token;
        try {
          token = await getToken();
        } catch {
          token = null;
        }
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get(`/api/post/${post._id}/comments`, { headers });
        if (!cancelled) {
          setComments(
            Array.isArray(res?.data?.comments) ? res.data.comments : []
          );
        }
      } catch (err) {
        console.error(
          "Failed to load comments",
          err?.response?.data || err?.message
        );
        toast.error("Failed to load comments");
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();

    const focusTimer = setTimeout(() => {
      try {
        composerRef.current?.focus?.();
      } catch (error) {
        console.error(error.message);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsOpen, post?._id]);

  // lock body scroll while comments panel is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (commentsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [commentsOpen]);

  // ---------- Event handlers ----------

  if (!post) {
    return (
      <div className="bg-white rounded-none sm:rounded-xl sm:shadow p-4 w-full max-w-2xl border-b sm:border">
        <div className="text-sm text-gray-500">Post data is unavailable.</div>
      </div>
    );
  }

  const isOwner = currentUser && post.user && currentUser._id === post.user._id;
  const content = post.content ?? "";
  const contentHtml = String(content).replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>'
  );

  const handleLike = async () => {
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post(
        "/api/post/like",
        { postId: post._id },
        { headers }
      );
      if (res?.data?.success) {
        const has =
          Array.isArray(likes) && likes.includes(currentUser?._id);
        const next = has
          ? likes.filter((id) => id !== currentUser._id)
          : [...(Array.isArray(likes) ? likes : []), currentUser._id];
        setLikes(next);
        if (typeof onUpdate === "function") onUpdate({ ...post, likes: next });
      } else {
        toast.error(res?.data?.message || "Couldn't update like");
      }
    } catch (err) {
      console.error("like err", err);
      toast.error("Failed to like post");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const candidates = [
        `/api/post/${post._id}`,
        `/api/posts/${post._id}`,
        `/api/post/delete/${post._id}`,
        `/api/posts/delete/${post._id}`,
      ];

      for (const path of candidates) {
        try {
          const r = await api.delete(path, { headers });
          if (r?.status === 200 || r?.status === 204 || r?.data?.success) {
            toast.success(r?.data?.message || "Post deleted");
            if (typeof onDelete === "function") onDelete(post._id);
            return;
          }
        } catch (err) {
          const status = err?.response?.status;
          if (status === 404) continue;
          console.warn(
            "delete err",
            path,
            err?.response?.data || err?.message
          );
          toast.error(err?.response?.data?.message || "Failed to delete post");
          return;
        }
      }
      toast.error("Post not found (tried multiple endpoints)");
    } catch (err) {
      console.error("delete flow error", err);
      toast.error("Delete failed");
    }
  };

  const openComments = () => setCommentsOpen(true);
  const closeComments = () => setCommentsOpen(false);

  const submitComment = async () => {
    const text = (commentText || "").trim();
    if (!text || !post?._id) return;
    setPostingComment(true);

    const tmp = {
      _id: `tmp_${Math.random().toString(36).slice(2, 9)}`,
      text,
      createdAt: new Date().toISOString(),
      user: {
        _id: currentUser?._id || "unknown",
        full_name: currentUser?.full_name || currentUser?.name || "You",
        avatar: currentUser?.profile_picture || currentUser?.avatar,
      },
    };
    setComments((c) => [tmp, ...c]);
    setCommentsCount((n) => n + 1);
    setCommentText("");

    try {
      const token = await getToken();
      const res = await api.post(
        `/api/post/${post._id}/comments`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.success && res?.data?.comment) {
        setComments((prev) => {
          const idx = prev.findIndex((p) =>
            String(p._id).startsWith("tmp_")
          );
          if (idx === -1) return [res.data.comment, ...prev];
          const cp = [...prev];
          cp[idx] = res.data.comment;
          return cp;
        });
        if (typeof onUpdate === "function")
          onUpdate({ ...post, comments_count: commentsCount });
      } else {
        const token2 = await getToken();
        const fres = await api.get(`/api/post/${post._id}/comments`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        setComments(
          Array.isArray(fres?.data?.comments) ? fres.data.comments : []
        );
      }
    } catch (err) {
      console.error("submit comment err", err);
      toast.error("Failed to post comment");
      setComments((prev) =>
        prev.filter((c) => !String(c._id).startsWith("tmp_"))
      );
      setCommentsCount((n) => Math.max(0, n - 1));
    } finally {
      setPostingComment(false);
      setTimeout(() => composerRef.current?.focus?.(), 50);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    setSharesCount((s) => s + 1);
    try {
      if (navigator.share) {
        await navigator.share({
          title: content.slice(0, 80) || "Post",
          text: content.slice(0, 140) || "",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Post link copied");
      }
    } catch (err) {
      console.debug("share failed or canceled", err);
    }

    try {
      const token = await getToken();
      await api.post(
        `/api/post/${post._id}/share`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn("share notify failed", err);
    }
    if (typeof onUpdate === "function")
      onUpdate({ ...post, shares_count: sharesCount });
  };

  // ---------- Render ----------

  return (
    <div className="bg-white w-full max-w-2xl border-b sm:border rounded-none sm:rounded-xl sm:shadow-sm px-3 py-3 sm:p-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div
          onClick={() =>
            post.user?._id && navigate("/profile/" + post.user._id)
          }
          className="inline-flex items-center gap-3 cursor-pointer"
        >
          <img
            src={post.user?.profile_picture}
            alt={post.user?.full_name || "avatar"}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-semibold truncate">
                {post.user?.full_name ?? "Unknown"}
              </span>
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-gray-500 text-xs sm:text-sm">
              @{post.user?.username ?? "unknown"} ·{" "}
              {moment(post.createdAt).fromNow()}
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="More"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-700" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-40 text-sm">
              <button
                onClick={() => {
                  navigate(`/post/${post._id}`);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                View Post
              </button>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
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
          className="mt-2 text-gray-900 text-sm sm:text-[15px] whitespace-pre-line leading-snug"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : null}

      {/* Images */}
      {imageUrls.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 rounded-lg overflow-hidden">
          {imageUrls.map((img, idx) => (
            <img
              src={img}
              key={idx}
              className={`w-full h-52 object-cover ${
                imageUrls.length === 1 ? "col-span-2 h-auto" : ""
              }`}
              alt={`media ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-5 text-gray-700 text-sm pt-2 border-t border-gray-200">
        <button
          className="flex items-center gap-1.5 active:scale-95"
          onClick={handleLike}
        >
          <Heart
            className={`w-5 h-5 ${
              Array.isArray(likes) && likes.includes(currentUser?._id)
                ? "text-red-500 fill-red-500"
                : ""
            }`}
          />
          <span className="text-xs sm:text-sm">
            {Array.isArray(likes) ? likes.length : 0}
          </span>
        </button>

        <button
          className="flex items-center gap-1.5 active:scale-95"
          onClick={openComments}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{commentsCount}</span>
        </button>

        <button
          className="flex items-center gap-1.5 active:scale-95"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{sharesCount}</span>
        </button>
      </div>

      {/* Comments bottom sheet (Instagram / YouTube style) */}
      {commentsOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeComments();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
        >
          <div
            ref={sheetRef}
            className="
              w-full sm:w-[900px]
              h-[80vh] sm:h-auto
              max-h-[92vh]
              bg-white
              rounded-t-2xl sm:rounded-2xl
              shadow-2xl
              overflow-hidden
              flex flex-col sm:flex-row
            "
            role="document"
            onTouchStart={(e) => {
              const el = sheetRef.current;
              if (!el) return;
              el._startY = e.touches?.[0]?.clientY ?? 0;
              el._currentDy = 0;
            }}
            onTouchMove={(e) => {
              const el = sheetRef.current;
              if (!el || typeof el._startY === "undefined") return;
              const y = e.touches?.[0]?.clientY ?? 0;
              const dy = Math.max(0, y - el._startY);
              el._currentDy = dy;
              if (window.innerWidth < 640) {
                el.style.transform = `translateY(${dy}px)`;
                el.style.transition = "transform 0s";
              }
            }}
            onTouchEnd={() => {
              const el = sheetRef.current;
              if (!el) return;
              const dy = el._currentDy || 0;
              el.style.transform = "";
              el.style.transition = "transform 160ms ease-out";
              if (dy > 120) {
                closeComments();
              }
              el._startY = 0;
              el._currentDy = 0;
            }}
          >
            {/* Handle bar (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Left: post preview (desktop only) */}
            <aside className="hidden sm:flex sm:flex-col sm:w-1/3 border-r border-gray-100 p-4 gap-3 bg-gray-50">
              <div className="flex items-start gap-3">
                <img
                  src={post?.user?.profile_picture}
                  alt={post?.user?.full_name || "user"}
                  className="w-10 h-10 rounded-full object-cover shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm truncate">
                        {post?.user?.full_name || "User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{post?.user?.username || "unknown"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {moment(post?.createdAt).fromNow()}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-800 line-clamp-4 whitespace-pre-line">
                    {post?.content}
                  </div>
                </div>
              </div>

              {Array.isArray(post?.image_urls) &&
                post?.image_urls.length > 0 && (
                  <div className="mt-2">
                    <img
                      src={post.image_urls[0]}
                      alt="post media"
                      className="w-full h-28 object-cover rounded-md"
                    />
                  </div>
                )}

              <div className="mt-auto text-xs text-gray-500">
                <div>
                  {Array.isArray(post?.likes)
                    ? post.likes.length
                    : Array.isArray(post?.likes_count)
                    ? post.likes_count.length
                    : 0}{" "}
                  likes
                </div>
                <div className="mt-1">
                  {post?.comments_count ??
                    (Array.isArray(post?.comments)
                      ? post.comments.length
                      : 0)}{" "}
                  comments
                </div>
              </div>
            </aside>

            {/* Right: comments + header + composer */}
            <div className="flex-1 flex flex-col pb-17">
              {/* header (like Instagram / YouTube) */}
              <div className="flex items-center justify-between px-4 pt-2 pb-2 sm:py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">Comments</span>
                  <span className="text-xs text-gray-500">
                    {comments.length}
                  </span>
                </div>
                <button
                  onClick={closeComments}
                  aria-label="Close comments"
                  className="p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* scroll area */}
              <div
                id={`comments-scroll-${post?._id || "sheet"}`}
                className="flex-1 overflow-y-auto px-4 pt-2 pb-24 sm:pb-3 space-y-3"
              >
                {loadingComments ? (
                  <div className="text-sm text-gray-500">
                    Loading comments…
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-gray-500 pt-4">
                    No comments yet — be the first.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <img
                        src={c.user?.avatar || c.user?.profile_picture}
                        alt={c.user?.full_name || "avatar"}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold sm:text-sm truncate">
                              {c.user?.full_name || "User"}
                            </div>
                            <div className="text-[11px] text-gray-500 sm:text-xs">
                              @{c.user?.username ||
                                (c.user?._id || "").slice(0, 8)}
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-400 whitespace-nowrap">
                            {moment(c.createdAt).fromNow()}
                          </div>
                        </div>

                        <div className="mt-1 text-sm text-gray-900">
                          {c.text}
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                          <button
                            className="hover:text-indigo-600"
                            onClick={() =>
                              toast.success("Reply not implemented")
                            }
                          >
                            Reply
                          </button>

                          {String(c.user?._id) ===
                            String(currentUser?._id) && (
                            <button
                              className="text-red-500 hover:bg-red-50 px-2 py-0.5 rounded-md"
                              onClick={async () => {
                                if (!window.confirm("Delete this comment?"))
                                  return;
                                try {
                                  const token = await getToken();
                                  await api.delete(
                                    `/api/post/${post._id}/comments/${c._id}`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  setComments((prev) =>
                                    prev.filter(
                                      (x) =>
                                        String(x._id) !== String(c._id)
                                    )
                                  );
                                  setCommentsCount((n) =>
                                    Math.max(0, n - 1)
                                  );
                                  toast.success("Comment deleted");
                                } catch (err) {
                                  console.error(
                                    "delete comment err",
                                    err
                                  );
                                  toast.error("Failed to delete comment");
                                }
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* bottom composer – Instagram / YouTube style */}
              <div className="border-t bg-white px-3 py-2">
                <div className="max-w-5xl mx-auto flex items-center gap-2 sm:gap-3">
                  {/* avatar hidden on very small screens, shown on sm+ */}
                  <img
                    src={currentUser?.profile_picture}
                    alt="you"
                    className="hidden sm:block w-9 h-9 rounded-full object-cover"
                  />

                  <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                    <input
                      ref={composerRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !postingComment) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400"
                      aria-label="Write a comment"
                    />

                    {/* mobile icon-only send */}
                    <button
                      onClick={submitComment}
                      disabled={postingComment || !commentText.trim()}
                      className="inline-flex sm:hidden items-center justify-center p-1.5 rounded-full bg-indigo-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Send comment"
                    >
                      <SendHorizonal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* desktop full button */}
                  <button
                    onClick={submitComment}
                    disabled={postingComment || !commentText.trim()}
                    className="hidden sm:inline-flex ml-1 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Send comment"
                  >
                    {postingComment ? "Posting…" : "Send"}
                  </button>
                </div>
              </div>
              {/* END composer */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
