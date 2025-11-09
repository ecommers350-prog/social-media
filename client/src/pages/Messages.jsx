// src/pages/Messages.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquarePlus, Search, Dot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";

const POLL_MS = 15000; // poll every 15s for unread counts

const Messages = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  // Your store shape might differ — adapt selectors as needed
  const { connections = [] } = useSelector((s) => s.connections || {});
  const { user: currentUser } = useSelector((s) => s.auth || {});

  const [query, setQuery] = useState("");
  const [unreadMap, setUnreadMap] = useState({}); // { [userIdOrMongoId]: number }
  const pollRef = useRef(null);

  // fetch unread counts and keep them fresh
  const fetchUnreadCounts = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/messages/unread-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // data: { success: true, items: [{ peerId: '...', count: 3 }, ...] }
      const map = {};
      for (const row of data.items || []) {
        map[row.peerId] = row.count;
      }
      setUnreadMap(map);
    } catch (err) {
      // silent fail; don’t spam toast for polling
      console.warn("Unread poll failed", err?.message);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchUnreadCounts, POLL_MS);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? connections
      : connections.filter((u) =>
          [u.full_name, u.username, u.bio]
            .filter(Boolean)
            .some((t) => String(t).toLowerCase().includes(q))
        );

    // merge unread counts into each item for rendering
    return base.map((u) => {
      const id = u._id || u.id; // adapt if you use clerkId
      const unreadCount =
        unreadMap[id] ??
        u.unreadCount ??
        (u.lastMessage?.unread ? 1 : 0) ??
        0;
      return { ...u, unreadCount };
    });
  }, [connections, query, unreadMap]);

  return (
    <div className="min-h-screen bg-white pt-6 md:pt-10 pb-10 overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <div className="border rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <button
              type="button"
              className="flex items-center gap-2 text-lg font-semibold text-slate-900"
            >
              <span className="truncate max-w-[12rem]">
                {currentUser?.username || "Messages"}
              </span>
              <ChevronDown className="h-5 w-5 opacity-70" />
            </button>

            <button
              onClick={() => navigate("/discover")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
              aria-label="New message"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Requests link */}
          <div className="px-5 pb-2">
            <button
              onClick={() => navigate("/messages/requests")}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Requests
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Threads list */}
          <ul
            className="max-h-[70vh] overflow-y-auto px-2 py-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,.25) transparent" }}
          >
            {filtered.length === 0 && (
              <li className="px-3 py-12 text-center text-slate-500">
                No conversations yet.
              </li>
            )}

            {filtered.map((user) => {
              const unread = Number(user.unreadCount || 0) > 0;
              const lastSnippet = user.lastMessage?.text || user.bio || "Say hi 👋";
              const time = user.lastMessage?.time || user.lastActive || "";

              return (
                <li key={user._id || user.id} className="group">
                  <button
                    onClick={() => navigate(`/messages/${user._id || user.id}`)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 active:scale-[0.99] transition text-left ${
                      unread ? "bg-slate-50/40" : ""
                    }`}
                  >
                    {/* Avatar with unread (blue) and online (green) dots */}
                    <div className="relative shrink-0">
                      <img
                        src={user.profile_picture}
                        alt={user.full_name || user.username}
                        className="h-14 w-14 rounded-full object-cover bg-slate-200"
                      />
                      {/* Unread blue dot (top-left) */}
                      {unread && (
                        <span
                          title="Unread messages"
                          className="absolute -top-0.5 -left-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white bg-blue-500"
                        />
                      )}
                      {/* Online green dot (bottom-right) */}
                      {user.isOnline && (
                        <span className="absolute right-0.5 bottom-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white bg-green-500" />
                      )}
                    </div>

                    {/* Texts */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate ${unread ? "font-semibold" : "font-medium"} text-slate-900`}>
                          {user.full_name || user.username}
                        </p>
                        {user.verified && <Dot className="h-4 w-4 text-blue-500" />}
                        {unread && (
                          <span className="ml-auto rounded-full bg-slate-900 text-white text-[10px] px-2 py-0.5">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className={`mt-0.5 flex items-center gap-1 text-xs ${unread ? "text-slate-800" : "text-slate-500"}`}>
                        <span className="truncate">{lastSnippet}</span>
                        {time && <span className="px-1">·</span>}
                        {time && <span className="whitespace-nowrap">{time}</span>}
                      </div>

                      <div className="text-xs text-slate-400 truncate">@{user.username}</div>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${user._id || user.id}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-500 underline hover:text-slate-700 transition whitespace-nowrap"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Messages;
