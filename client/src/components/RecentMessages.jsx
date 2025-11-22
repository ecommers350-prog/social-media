// src/components/RecentMessages.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

// Helper: compact time like Instagram (3m, 2h, 4d, etc.)
const formatTimeCompact = (dateStr) => {
  if (!dateStr) return "";
  const now = Date.now();
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "";

  const diffMs = now - t;
  if (diffMs < 0) return "";

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);

  if (sec < 60) return `${sec || 1}s`;
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return `${wk}w`;
};

const RecentMessages = () => {
  const [messages, setMessages] = useState([]); // array of latest message per peer
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  const pollingRef = useRef(null);
  const mountedRef = useRef(true);

  // Helper: given a message, return the sender id string and sender object (if embedded)
  const getSenderInfo = (message) => {
    const raw = message.from_user_id ?? message.from ?? message.sender ?? null;
    let senderId = null;
    let senderObj = null;

    if (!raw) return { senderId: null, senderObj: null };

    if (typeof raw === "string") {
      senderId = raw;
    } else if (typeof raw === "object") {
      // try common fields
      senderId = raw._id ?? raw.id ?? raw.userId ?? null;
      senderObj = raw;
    }

    return { senderId, senderObj };
  };

  const fetchRecentMessages = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/message/recent", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data) throw new Error("No response from server");

      if (!data.success) {
        toast.error(data.message || "Failed to fetch recent messages");
        setLoading(false);
        return;
      }

      const serverMessages = Array.isArray(data.messages) ? data.messages : [];

      // Group by senderId and keep latest (by createdAt)
      const grouped = serverMessages.reduce((acc, msg) => {
        const { senderId, senderObj } = getSenderInfo(msg);
        if (!senderId) return acc;

        const existing = acc[senderId];
        if (!existing) {
          acc[senderId] = { msg, senderObj, senderId };
          return acc;
        }

        const existingDate = new Date(
          existing.msg.createdAt || existing.msg.created_at || 0
        ).getTime();
        const msgDate = new Date(msg.createdAt || msg.created_at || 0).getTime();

        if (msgDate > existingDate) {
          acc[senderId] = { msg, senderObj, senderId };
        }
        return acc;
      }, {});

      // Turn into sorted array by createdAt descending
      const latestPerSender = Object.values(grouped)
        .map((entry) => {
          const m = entry.msg;
          const { senderObj, senderId } = entry;

          // if senderObj missing, try to locate it inside msg
          const sender =
            senderObj ||
            (m.from_user_id && typeof m.from_user_id === "object"
              ? m.from_user_id
              : null);

          return {
            message: m,
            senderId,
            sender,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.message.createdAt || b.message.created_at) -
            new Date(a.message.createdAt || a.message.created_at)
        );

      if (mountedRef.current) {
        setMessages(latestPerSender);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch recent messages";
      toast.error(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) return;

    // initial fetch
    fetchRecentMessages();

    // polling: every 30s
    pollingRef.current = setInterval(() => {
      fetchRecentMessages();
    }, 30000);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, fetchRecentMessages]);

  return (
    <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-2xl shadow-sm text-xs text-slate-800 border border-slate-100">
      {/* Header like Instagram "Messages" + refresh */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 text-sm">Messages</h3>
        <button
          onClick={() => fetchRecentMessages()}
          className="text-[11px] text-slate-500 hover:text-slate-700"
          title="Refresh"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {messages.length === 0 && !loading ? (
        <div className="text-slate-500 text-[13px]">No recent messages</div>
      ) : (
        <div className="flex flex-col max-h-64 overflow-y-auto no-scrollbar">
          {messages.map(({ message, senderId, sender }) => {
            const profile =
              sender ||
              (message.from_user_id &&
              typeof message.from_user_id === "object"
                ? message.from_user_id
                : null);

            const displayName =
              profile?.full_name ||
              profile?.name ||
              profile?.username ||
              "Unknown";
            const username = profile?.username || "";
            const profilePic =
              profile?.profile_picture || profile?.avatar || "/default-avatar.png";
            const isOnline = profile?.isOnline;

            // snippet like IG: prefer text, else Photo/Media
            let snippet = "Media";
            if (message.text) {
              snippet = String(message.text).slice(0, 60);
            } else if (message.message_type === "image") {
              snippet = "Photo";
            }

            const seen = message.seen === true || message.seen === "true";
            const timeLabel = formatTimeCompact(
              message.createdAt || message.created_at
            );

            return (
              <Link
                to={`/messages/${senderId}`}
                key={senderId}
                className="flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 transition"
              >
                {/* Avatar + online dot */}
                <div className="relative shrink-0">
                  <img
                    src={profilePic}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                  )}
                </div>

                {/* Name + snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-[13px] truncate ${
                        seen ? "font-medium text-slate-800" : "font-semibold text-slate-900"
                      }`}
                    >
                      {displayName}
                    </p>
                    {timeLabel && (
                      <span className="ml-2 text-[10px] text-slate-400 shrink-0">
                        {timeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <p
                      className={`text-[12px] truncate ${
                        seen ? "text-slate-500" : "text-slate-800 font-medium"
                      }`}
                    >
                      {snippet}
                    </p>

                    {/* Unread indicator (blue dot) */}
                    {!seen && (
                      <span className="ml-2 w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>

                  {/* Optional username line like IG (small, subtle) */}
                  {username && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      @{username}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentMessages;
