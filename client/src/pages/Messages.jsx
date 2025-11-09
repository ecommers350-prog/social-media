import React, { useMemo, useState } from "react";
import { ChevronDown, MessageSquarePlus, Search, Dot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const Messages = () => {
  const navigate = useNavigate();
  const { connections = [] } = useSelector((s) => s.connections || {});
  const { user: currentUser } = useSelector((s) => s.auth || {}); // optional

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((u) =>
      [u.full_name, u.username, u.bio]
        .filter(Boolean)
        .some((t) => t.toLowerCase().includes(q))
    );
  }, [connections, query]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        {/* Thread list shell */}
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
              onClick={() => navigate("/messages/new")}
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
              const lastSnippet =
                user.lastMessage?.text ||
                user.bio ||
                "Say hi 👋";
              const time =
                user.lastMessage?.time || user.lastActive || "";

              return (
                <li
                  key={user._id}
                  className="group"
                >
                  <button
                    onClick={() => navigate(`/messages/${user._id}`)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 active:scale-[0.99] transition text-left"
                  >
                    {/* Avatar + online dot */}
                    <div className="relative shrink-0">
                      <img
                        src={user.profile_picture}
                        alt={user.full_name}
                        className="h-14 w-14 rounded-full object-cover bg-slate-200"
                      />
                      {user.isOnline && (
                        <span className="absolute right-0.5 bottom-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white bg-green-500" />
                      )}
                    </div>

                    {/* Texts */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-900">
                          {user.full_name || user.username}
                        </p>
                        {user.verified && (
                          <Dot className="h-4 w-4 text-blue-500" />
                        )}
                        {/* Unread pill (optional) */}
                        {user.unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-slate-900 text-white text-[10px] px-2 py-0.5">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <span className="truncate">
                          {lastSnippet}
                        </span>
                        {time && <span className="px-1">·</span>}
                        {time && <span className="whitespace-nowrap">{time}</span>}
                      </div>

                      {/* username line */}
                      <div className="text-xs text-slate-400 truncate">
                        @{user.username}
                      </div>
                    </div>

                    {/* Subtle “open profile” affordance on hover */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${user._id}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-500 underline hover:text-slate-700 transition whitespace-nowrap"
                    >
                      
                    </div>
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
