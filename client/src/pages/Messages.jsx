// src/pages/Messages.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquarePlus, Search, Dot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";

const POLL_MS = 15000; // poll every 15s for unread counts

// Utility to render a tiny indicator ring like Instagram
const StoryRing = ({ src, size = 56, hasStory = false, isActive = false }) => (
  <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center ${
        hasStory
          ? "p-[2.5px] bg-gradient-to-tr from-pink-500 via-yellow-400 to-orange-500"
          : "p-0"
      }`}
      style={{ width: size, height: size }}
    >
      <div
        className="rounded-full bg-slate-100 overflow-hidden flex items-center justify-center"
        style={{ width: "100%", height: "100%", padding: hasStory ? "2px" : 0 }}
      >
        <img
          src={src}
          alt="avatar"
          className="object-cover rounded-full w-full h-full"
        />
      </div>
    </div>

    {isActive && (
      <span className="absolute right-0.5 bottom-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white bg-green-500" />
    )}
  </div>
);

const Messages = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const { connections = [] } = useSelector((s) => s.connections || {});
  const { user: currentUser } = useSelector((s) => s.auth || {});

  const [query, setQuery] = useState("");
  const [unreadMap, setUnreadMap] = useState({});
  const pollRef = useRef(null);

  // fetch unread counts and keep them fresh
  const fetchUnreadCounts = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/messages/unread-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const map = {};
      for (const row of (data.items || [])) map[row.peerId] = row.count;
      setUnreadMap(map);
    } catch (err) {
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

    return base.map((u) => {
      const id = u._id || u.id;
      const unreadCount =
        unreadMap[id] ?? u.unreadCount ?? (u.lastMessage?.unread ? 1 : 0) ?? 0;
      return { ...u, unreadCount };
    });
  }, [connections, query, unreadMap]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-3xl md:px-2">
        {/* Sticky mobile-style header (like Instagram) */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
          {/* Top bar: username + chevron + new message */}
          <div className="flex items-center justify-between px-4 h-12 md:h-14">
            <button
              type="button"
              className="flex items-center gap-1.5 text-base md:text-lg font-semibold text-slate-900"
            >
              <span className="truncate max-w-[11rem] md:max-w-[14rem]">
                {currentUser?.username || "Messages"}
              </span>
              <ChevronDown className="h-4 w-4 md:h-5 md:w-5 opacity-70" />
            </button>

            <button
              onClick={() => navigate("/discover")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
              aria-label="New message"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>

          {/* Horizontal “notes / stories” row */}
          <div className="flex items-center gap-3 overflow-x-auto px-3 pb-2 pt-1 hide-scrollbar">
            {/* Optional “Your note” pill – just a placeholder */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 shrink-0 bg-slate-50"
            >
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  Your note
                </span>
                <span className="text-[11px] text-slate-500">
                  Add a note for your followers
                </span>
              </div>
            </button>

            {connections.slice(0, 10).map((c) => (
              <div
                key={c._id || c.id}
                className="flex flex-col items-center gap-1 w-16 shrink-0"
              >
                <StoryRing
                  src={c.profile_picture}
                  hasStory={!!c.hasStory}
                  isActive={c.isOnline}
                  size={52}
                />
                <span className="text-[11px] truncate w-full text-center text-slate-700">
                  {c.full_name || c.username}
                </span>
              </div>
            ))}
          </div>

          {/* Search bar (full-width, IG style) */}
          <div className="px-3 pb-2">
            <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-600">
              <Search className="h-4 w-4 opacity-70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent outline-none placeholder:text-slate-400 text-[13px]"
              />
            </label>
          </div>

          {/* Messages / Requests row */}
          <div className="flex items-center justify-between px-4 pb-2">
            <h1 className="text-sm font-semibold text-slate-900">Messages</h1>
            <button
              onClick={() => navigate("/messages/requests")}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Requests
            </button>
          </div>
        </div>

        {/* Threads list – scrollable under sticky header */}
        <ul
          className="px-1 md:px-0 pt-1 pb-4 max-h-[calc(100vh-56px)] md:max-h-[calc(100vh-64px)] overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,0,0,.25) transparent",
          }}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-12 text-center text-slate-500">
              No conversations yet.
            </li>
          )}

          {filtered.map((user) => {
            const unread = Number(user.unreadCount || 0) > 0;
            const lastSnippet =
              user.lastMessage?.text || user.bio || "Say hi 👋";
            const time = user.lastMessage?.time || user.lastActive || "";

            return (
              <li key={user._id || user.id} className="group">
                <button
                  onClick={() => navigate(`/messages/${user._id || user.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 md:py-3 active:scale-[0.99] transition text-left ${
                    unread ? "bg-slate-50" : "bg-white"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`rounded-full overflow-hidden w-14 h-14 ${
                        unread ? "ring-2 ring-blue-500/80" : ""
                      }`}
                    >
                      <img
                        src={user.profile_picture}
                        alt={user.full_name || user.username}
                        className="h-14 w-14 rounded-full object-cover bg-slate-200"
                      />
                    </div>

                    {/* Online green dot bottom-right */}
                    {user.isOnline && (
                      <span className="absolute right-0.5 bottom-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white bg-green-500" />
                    )}
                  </div>

                  {/* Main text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`truncate text-[14px] ${
                          unread ? "font-semibold" : "font-medium"
                        } text-slate-900`}
                      >
                        {user.full_name || user.username}
                      </p>

                      {user.verified && (
                        <Dot className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}

                      {/* time on the right (like IG) */}
                      {time && (
                        <span className="ml-auto text-[11px] text-slate-400">
                          {time}
                        </span>
                      )}
                    </div>

                    <div
                      className={`mt-0.5 flex items-center gap-1 text-[12px] ${
                        unread ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      <span className="truncate">{lastSnippet}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate">
                      @{user.username}
                    </div>
                  </div>

                  {/* Unread blue dot on the far right */}
                  {unread && (
                    <span
                      title="Unread messages"
                      className="ml-1 h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0"
                    />
                  )}

                  {/* Invisible clickable area for profile on hover (desktop) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${user._id || user.id}`);
                    }}
                    className="hidden md:block md:opacity-0 md:group-hover:opacity-100 text-[11px] text-slate-500 underline hover:text-slate-700 transition whitespace-nowrap"
                  >
                    View profile
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Messages;
