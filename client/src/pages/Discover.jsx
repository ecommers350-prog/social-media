// src/pages/Discover.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, MessageSquare, UserPlus, Check } from "lucide-react";
import Loading from "../components/Loading";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "../features/user/userSlice";
import { useNavigate } from "react-router-dom";

const SUGGESTIONS_LIMIT = 6;
const DEBOUNCE_MS = 600;

const Discover = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]); // search results
  const [suggestions, setSuggestions] = useState([]); // initial suggestions
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const debounceRef = useRef(null);

  // fetch suggestions on mount
  const fetchSuggestions = useCallback(async () => {
    try {
      setLoadingSuggestions(true);
      const token = await getToken();
      const { data } = await api.post(
        "/api/user/discover",
        { input: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.success) {
        setSuggestions((data.users || []).slice(0, SUGGESTIONS_LIMIT));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Suggestions error", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to load suggestions");
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [getToken]);

  // run a search (explicit)
  const runSearch = useCallback(
    async (q) => {
      try {
        setLoading(true);
        const token = await getToken();
        const { data } = await api.post(
          "/api/user/discover",
          { input: q ?? "" },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data?.success) {
          setUsers(data.users || []);
        } else {
          setUsers([]);
          if (q) toast.error(data?.message || "No users found");
        }
      } catch (err) {
        console.error("Search error", err);
        toast.error(err?.response?.data?.message || err?.message || "Search failed");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  // debounce live search while typing
  useEffect(() => {
    if (!input.trim()) {
      setUsers([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(input.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [input, runSearch]);

  // mount: fetch user info and suggestions
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) dispatch(fetchUser(token));
      } catch (error) {
        console.error(error?.message || error);
      }
    })();

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, getToken, fetchSuggestions]);

  const handleKeyUp = (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceRef.current);
      runSearch(input.trim());
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const term = suggestion.full_name || suggestion.username || suggestion.bio || "";
    setInput(term);
    runSearch(term);
    // small scroll so user sees results
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  // follow / unfollow action
  const handleFollowToggle = async (userId, currentlyFollowing) => {
    try {
      const token = await getToken();
      const endpoint = currentlyFollowing ? "/api/user/unfollow" : "/api/user/follow";
      const { data } = await api.post(
        endpoint,
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        toast.success(data.message || (currentlyFollowing ? "Unfollowed" : "Followed"));
        // update UI locally if possible (optimistic)
        setUsers((prev) =>
          prev.map((u) => (String(u._id) === String(userId) ? { ...u, isFollowing: !currentlyFollowing } : u))
        );
        setSuggestions((prev) =>
          prev.map((u) => (String(u._id) === String(userId) ? { ...u, isFollowing: !currentlyFollowing } : u))
        );
      } else {
        toast.error(data?.message || "Action failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Request failed");
    }
  };

  // Data source: prefer search results; fall back to suggestions when no input
  const list = useMemo(() => {
    if (users && users.length > 0) return users;
    return suggestions;
  }, [users, suggestions]);

  // small helper for safe avatar url
  const avatarFor = (u) => u?.profile_picture || u?.avatar || "/default-avatar.png";

  // Mobile-first row (IG-like)
  const UserRow = ({ u }) => {
    const id = u?._id || u?.id || "";
    const name = u?.full_name || u?.name || u?.username || "Unknown";
    const username = u?.username || "";
    const bio = u?.bio ? String(u.bio).slice(0, 80) : "";

    return (
      <article
        key={id}
        className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50"
        role="listitem"
      >
        {/* Avatar */}
        <button
          onClick={() => navigate(`/profile/${id}`)}
          className="flex-shrink-0 rounded-full overflow-hidden w-12 h-12"
          aria-label={`Open ${name}'s profile`}
        >
          <img src={avatarFor(u)} alt={name} className="w-full h-full object-cover" />
        </button>

        {/* Name / username / bio */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/profile/${id}`)}
              className="text-left min-w-0 w-full"
              aria-label={`Open ${name}'s profile`}
            >
              <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
              <p className="text-sm text-gray-500">@{username}</p>
            </button>
          </div>

          {bio ? <p className="text-xs text-gray-500 mt-1 truncate">{bio}</p> : null}
        </div>

        {/* Actions: follow pill + message icon */}
        <div className="flex flex-col items-end gap-2 ml-2">
          <button
            onClick={() => handleFollowToggle(id, !!u.isFollowing)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition ${
              u.isFollowing
                ? "bg-white border border-gray-200 text-gray-700"
                : "bg-indigo-600 text-white"
            }`}
            aria-pressed={!!u.isFollowing}
            aria-label={u.isFollowing ? "Following" : "Follow"}
          >
            {u.isFollowing ? (
              <>
                <Check className="w-3 h-3" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                <span>Follow</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/messages/${id}`)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
            aria-label={`Message ${name}`}
            title="Message"
          >
            <MessageSquare className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header like Instagram: search always visible */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyUp={handleKeyUp}
                placeholder="Search people"
                className="w-full pl-10 pr-3 py-2 rounded-full border border-gray-100 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Search people"
              />
            </div>
            <button
              onClick={() => runSearch(input.trim())}
              className="px-3 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium"
              aria-label="Search"
            >
              Search
            </button>
          </div>

          {/* Suggestions carousel */}
          <div className="mt-3">
            {loadingSuggestions ? (
              <div className="py-4">
                <Loading height="48px" />
              </div>
            ) : suggestions.length > 0 && users.length === 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 pl-1">
                {suggestions.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex-shrink-0 w-24 p-2 rounded-lg bg-white border border-gray-100 shadow-sm text-center"
                    aria-label={`Open ${s.full_name || s.username}`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-1">
                      <img src={avatarFor(s)} alt={s.full_name || s.username} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-medium text-gray-800 truncate">{s.full_name || s.username}</div>
                    <div className="text-[11px] text-gray-500">@{s.username}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Results list */}
      <main className="max-w-3xl mx-auto">
        {loading ? (
          <div className="py-12">
            <Loading height="40vh" />
          </div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            {input ? (
              <p>
                No users found for <span className="font-medium text-gray-800">"{input}"</span>. Try another search.
              </p>
            ) : (
              <p>Start typing or pick a suggestion to discover people.</p>
            )}
          </div>
        ) : (
          <div role="list" className="divide-y divide-gray-100">
            {list.map((u) => (
              <UserRow key={u._id || u.id || u.username} u={u} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;
