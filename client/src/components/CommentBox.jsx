import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";
import api from "../api/axios";

const PAGE_SIZE = 10;

const CommentBox = ({ postId }) => {
  const { getToken } = useAuth();
  const currentUser = useSelector((s) => s.user.value);

  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");

  const textareaRef = useRef(null);

  const hasMore = useMemo(() => comments.length < totalCount, [comments, totalCount]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [text]);

  // Fetch comments
  const fetchComments = async (opts = { reset: false }) => {
    try {
      if (opts.reset) {
        setLoading(true);
        setPage(1);
      }
      const token = await getToken();
      const { data } = await api.get(`/api/post/${postId}/comments`, {
        params: { page: opts.reset ? 1 : page, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Expecting { comments: [...], total: number }
      const list = data?.comments ?? [];
      const total = data?.total ?? list.length;

      if (opts.reset) {
        setComments(list);
        setTotalCount(total);
      } else {
        setComments((prev) => [...prev, ...list]);
        setTotalCount(total);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) fetchComments({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadMore = async () => {
    setPage((p) => p + 1);
    try {
      const nextPage = page + 1;
      const token = await getToken();
      const { data } = await api.get(`/api/post/${postId}/comments`, {
        params: { page: nextPage, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = data?.comments ?? [];
      const total = data?.total ?? totalCount;

      setComments((prev) => [...prev, ...list]);
      setTotalCount(total);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load more");
    }
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content) return;

    setSending(true);
    const tempId = "temp-" + Date.now();

    // Optimistic add
    const optimistic = {
      _id: tempId,
      content,
      createdAt: new Date().toISOString(),
      user: {
        _id: currentUser?._id,
        full_name: currentUser?.full_name || "You",
        username: currentUser?.username || "you",
        profile_picture: currentUser?.profile_picture,
      },
    };
    setComments((prev) => [optimistic, ...prev]);
    setTotalCount((c) => c + 1);
    setText("");

    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/post/comment",
        { postId, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Expecting the created comment back as data.comment
      const saved = data?.comment;
      if (!saved) {
        throw new Error("Server did not return the created comment.");
      }

      // Replace optimistic with real one
      setComments((prev) =>
        prev.map((c) => (c._id === tempId ? saved : c))
      );
    } catch (err) {
      // Revert optimistic change
      setComments((prev) => prev.filter((c) => c._id !== tempId));
      setTotalCount((c) => Math.max(0, c - 1));
      console.error(err);
      toast.error(err?.message || "Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!sending) handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 w-full max-w-2xl">
      <h3 className="text-base font-semibold mb-3">
        Comments {totalCount ? `(${totalCount})` : ""}
      </h3>

      {/* Composer */}
      <div className="flex items-start gap-3 mb-4">
        <img
          src={currentUser?.profile_picture}
          alt="you"
          className="w-9 h-9 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="border rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment…"
              rows={1}
              className="w-full resize-none outline-none text-sm"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">Press ⌘/Ctrl + Enter to send</p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending || !text.trim()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="text-sm">Comment</span>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-gray-500">Be the first to comment.</div>
        ) : (
          comments.map((c) => (
            <CommentItem key={c._id} comment={c} />
          ))
        )}
      </div>

      {/* Load more */}
      {!loading && hasMore && (
        <div className="mt-4">
          <button
            type="button"
            onClick={loadMore}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

const CommentItem = ({ comment }) => {
  return (
    <div className="flex items-start gap-3">
      <img
        src={comment.user?.profile_picture}
        alt={comment.user?.full_name}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.user?.full_name}</span>
          <span className="text-xs text-gray-500">
            @{comment.user?.username} · {moment(comment.createdAt).fromNow()}
          </span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">
          {comment.content}
        </p>
      </div>
    </div>
  );
};

export default CommentBox;
