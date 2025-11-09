// src/components/StoryViewer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Heart, MessageSquareMore, SendHorizonal, X } from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../api/axios";

/**
 * Props:
 *  - viewStory: {
 *      _id: string,
 *      media_type: "image" | "video" | "text",
 *      media_url?: string,
 *      content?: string,             // for text stories
 *      background_color?: string,    // for text stories
 *      user: { _id?: string, id?: string, full_name?: string, profile_picture?: string } | string
 *      userId?: string, ownerId?: string
 *    } | null
 *  - setViewStory: (val: null) => void
 *  - onPrev?: () => void
 *  - onNext?: () => void
 *  - currentUserId?: string          // (optional) pass your app's user id (Mongo _id or Clerk id)
 *
 * Notes:
 *  - Owner-only action bar is shown when current user id === story owner id (normalized).
 */

const DURATION_IMAGE_TEXT_MS = 10000; // 10s

function contrastText(hex = "#000000") {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#FFFFFF";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#000000" : "#FFFFFF";
}

const StoryViewer = ({ viewStory, setViewStory, onPrev, onNext, currentUserId }) => {
  const { getToken } = useAuth();
  const { user } = useUser();

  // --- UI state ---
  const [progress, setProgress] = useState(0); // image/text progress
  const [videoProgress, setVideoProgress] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  const videoRef = useRef(null);
  const modalRef = useRef(null);

  const isOpen = !!viewStory;
  const isVideo = viewStory?.media_type === "video";
  const isText = viewStory?.media_type === "text";
  const bg = isText ? (viewStory?.background_color || "#000000") : "rgba(0,0,0,0.9)";
  const textColor = useMemo(
    () => (isText ? contrastText(viewStory?.background_color) : "#FFFFFF"),
    [isText, viewStory?.background_color]
  );

  // --- Robust owner check (handles many shapes) ---
  const currentIdRaw =
    (typeof currentUserId !== "undefined" && currentUserId) ||
    user?.publicMetadata?.mongoId || // if you mirror Mongo _id into Clerk
    user?.id ||
    user?.unsafeMetadata?.mongoId;

  const ownerIdRaw =
    (viewStory?.user && typeof viewStory.user === "object" && (viewStory.user._id || viewStory.user.id)) ||
    (typeof viewStory?.user === "string" && viewStory.user) ||
    viewStory?.userId ||
    viewStory?.ownerId;

  const norm = (v) => (v == null ? "" : String(v));
  const isOwner = !!norm(currentIdRaw) && !!norm(ownerIdRaw) && norm(currentIdRaw) === norm(ownerIdRaw);

  // --- Body scroll lock & focus ---
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // --- ESC/Arrows ---
  const onKeyDown = (e) => {
    if (e.key === "Escape") setViewStory(null);
    if (e.key === "ArrowRight" && onNext) onNext();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
  };

  // --- Backdrop click to close ---
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) setViewStory(null);
  };

  // --- Swipe-down to close (touch) ---
  useEffect(() => {
    if (!isOpen) return;
    const el = modalRef.current;
    let sy = 0,
      active = false;
    const MAX_Y = 120;
    const start = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      sy = t.clientY;
      active = true;
    };
    const move = (e) => {
      if (!active) return;
      const t = e.touches?.[0];
      if (!t) return;
      const dy = t.clientY - sy;
      if (dy > 0) {
        el.style.transform = `translateY(${dy}px)`;
        el.style.opacity = String(Math.max(0.4, 1 - dy / 240));
      }
    };
    const end = () => {
      if (!active) return;
      active = false;
      const tr = parseFloat(el.style.transform?.match(/-?\d+\.?\d*/)?.[0] || 0);
      el.style.transform = "";
      el.style.opacity = "";
      if (tr > MAX_Y) setViewStory(null);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
    };
  }, [isOpen, setViewStory]);

  // --- Progress for image/text ---
  useEffect(() => {
    if (!isOpen) return;
    if (isVideo) return; // video uses timeupdate
    setProgress(0);
    let elapsed = 0;
    const tick = 100;
    const timer = setInterval(() => {
      elapsed += tick;
      const pct = Math.min(100, (elapsed / DURATION_IMAGE_TEXT_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setViewStory(null);
      }
    }, tick);
    return () => clearInterval(timer);
  }, [isOpen, isVideo, setViewStory]);

  // --- Video progress ---
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration) || v.duration <= 0) {
      setVideoProgress(0);
      return;
    }
    const pct = (v.currentTime / v.duration) * 100;
    setVideoProgress(Math.max(0, Math.min(100, pct)));
  };

  // --- Fetch owner-only interaction data (likes, comments) ---
  useEffect(() => {
    const bootstrap = async () => {
      if (!isOpen || !isOwner || !viewStory?._id) return;
      try {
        const token = await getToken();
        const [likeRes, commentRes] = await Promise.all([
          api.get(`/api/story/${viewStory._id}/like-status`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get(`/api/story/${viewStory._id}/comments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setLiked(!!likeRes?.data?.liked);
        setLikeCount(Number(likeRes?.data?.count || 0));
        setComments(Array.isArray(commentRes?.data?.comments) ? commentRes.data.comments : []);
      } catch (e) {
        console.warn("Failed to load story interactions", e?.message);
      }
    };
    bootstrap();
  }, [isOpen, isOwner, viewStory?._id, getToken]);

  // --- Like toggle (owner-only) ---
  const toggleLike = async () => {
    if (!isOwner || !viewStory?._id) return;
    const optimistic = !liked;
    setLiked(optimistic);
    setLikeCount((c) => c + (optimistic ? 1 : -1));
    try {
      const token = await getToken();
      await api.post(
        `/api/story/${viewStory._id}/like`,
        { like: optimistic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch  {
      // rollback
      setLiked(!optimistic);
      setLikeCount((c) => c - (optimistic ? 1 : -1));
    }
  };

  // --- Submit comment (owner-only) ---
  const submitComment = async () => {
    if (!isOwner || !viewStory?._id) return;
    const text = commentText.trim();
    if (!text) return;
    setSending(true);
    try {
      const token = await getToken();
      const { data } = await api.post(
        `/api/story/${viewStory._id}/comments`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const saved =
        data?.comment || {
          _id: Math.random().toString(36),
          text,
          createdAt: new Date().toISOString(),
          user: { _id: norm(currentIdRaw), full_name: user?.fullName, avatar: user?.imageUrl },
        };
      setComments((arr) => [saved, ...arr]);
      setCommentText("");
    } catch (e) {
      console.warn("Failed to add comment", e?.message);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: bg }}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
      onMouseDown={onBackdrop}
      onKeyDown={onKeyDown}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
        <div
          className="h-full bg-white transition-[width] duration-100 ease-linear"
          style={{ width: `${isVideo ? videoProgress : progress}%` }}
        />
      </div>

      {/* Header: user & close */}
      <div className="absolute top-4 left-4 flex items-center space-x-3 p-2 px-4 sm:p-4 sm:px-6 backdrop-blur-md rounded bg-black/40">
        {viewStory?.user?.profile_picture && (
          <img
            src={viewStory.user.profile_picture}
            alt={viewStory?.user?.full_name || "user"}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-white/80"
          />
        )}
        <div className="text-white font-medium flex items-center gap-1">
          <span>{viewStory?.user?.full_name || "User"}</span>
          <BadgeCheck size={18} />
        </div>
      </div>

      <button
        onClick={() => setViewStory(null)}
        aria-label="Close story"
        className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Content container (stop propagation so backdrop click works) */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center outline-none"
      >
        {viewStory.media_type === "image" && (
          <img
            src={viewStory.media_url}
            alt={viewStory.alt || "story image"}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        )}

        {viewStory.media_type === "video" && (
          <video
            ref={videoRef}
            src={viewStory.media_url}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onEnded={() => setViewStory(null)}
            onTimeUpdate={onTimeUpdate}
            autoPlay
            controls
            playsInline
          />
        )}

        {viewStory.media_type === "text" && (
          <div
            className="w-[90vw] h-[70vh] sm:w-[60vw] sm:h-[70vh] flex items-center justify-center p-8 text-center rounded-lg"
            style={{ color: textColor }}
          >
            <p className="whitespace-pre-wrap text-2xl leading-relaxed select-text">{viewStory.content}</p>
          </div>
        )}
      </div>

      {/* Owner-only Interaction Bar */}
      {isOwner && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(720px,90vw)]">
          <div className="rounded-2xl bg-black/50 backdrop-blur p-3 sm:p-4 text-white shadow-xl">
            {/* Like row */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 active:scale-95 transition ${
                  liked ? "text-rose-400" : ""
                }`}
                aria-pressed={liked}
                aria-label="Toggle like"
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                <span className="text-sm">{likeCount}</span>
              </button>

              <div className="flex items-center gap-2 text-sm opacity-90">
                <MessageSquareMore className="w-5 h-5" />
                <span>{comments.length}</span>
              </div>
            </div>

            {/* Comments list */}
            <div className="mt-3 max-h-40 overflow-y-auto space-y-2 pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-white/60">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="flex items-start gap-2 text-sm">
                    {c.user?.avatar && (
                      <img src={c.user.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                    )}
                    <div>
                      <span className="font-medium">{c.user?.full_name || "User"}</span>
                      <span className="ml-2 opacity-90">{c.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="mt-3 flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitComment();
                }}
                placeholder="Add a comment…"
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 outline-none placeholder:text-white/60"
              />
              <button
                onClick={submitComment}
                disabled={sending || !commentText.trim()}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60"
                aria-label="Send comment"
              >
                <SendHorizonal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default StoryViewer;
