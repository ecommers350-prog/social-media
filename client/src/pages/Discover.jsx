import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import Loading from "../components/Loading";
import UserCard from "../components/UserCard";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "../features/user/userSlice";

const SUGGESTIONS_LIMIT = 6;
const DEBOUNCE_MS = 600;

const Discover = () => {
  const dispatch = useDispatch();
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
          toast.error(data?.message || "No users found");
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
    // if input is empty, clear search results (we show suggestions)
    if (!input.trim()) {
      setUsers([]);
      // we still keep suggestions visible
      return;
    }

    // debounce
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
        toast.error(error.message)
      }
    })();

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, getToken, fetchSuggestions]);

  // Enter key: run immediate search
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
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Discover People</h1>
          <p className="text-slate-600">Connect with interesting people — search by name, username, bio or location.</p>
        </header>

        {/* Search */}
        <div className="mb-6">
          <div className="bg-white border border-slate-200 rounded-md shadow-sm p-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyUp={handleKeyUp}
                placeholder="Search people by name, username, bio, or location..."
                className="pl-12 pr-4 py-3 w-full rounded-md text-slate-700 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Search people"
              />
            </div>

            {/* Suggestions (compact horizontal list) */}
            <div className="mt-4">
              {loadingSuggestions ? (
                <div className="py-4">
                  <Loading height="56px" />
                </div>
              ) : suggestions.length > 0 && users.length === 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-700">Suggested for you</h3>
                    <button
                      onClick={() => runSearch("")}
                      className="text-xs text-indigo-600 hover:underline"
                      aria-label="See all suggestions"
                    >
                      
                    </button>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {suggestions.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => handleSuggestionClick(u)}
                        className="flex-shrink-0 flex flex-col items-center gap-2 bg-white border border-slate-100 rounded-lg p-2 w-32 text-center shadow-sm hover:shadow-md"
                        aria-label={`View ${u.full_name || u.username}`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                          <img src={u.profile_picture} alt={u.full_name || u.username} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs font-medium text-slate-700 truncate w-full">{u.full_name || u.username}</div>
                        <div className="text-[11px] text-slate-500 truncate w-full">@{u.username}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Results */}
        <section>
          {loading ? (
            <div className="py-12">
              <Loading height="40vh" />
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
              {users.map((u) => (
                <UserCard key={u._id} user={u} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-600">
              {input ? (
                <p>No users found for <span className="font-medium text-slate-800">"{input}"</span>. Try another search.</p>
              ) : (
                <p>Start typing or pick a suggestion to discover people.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Discover;
