// src/pages/Connections.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  UserCheck,
  UserRoundPen,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { fetchConnections } from "../features/connections/connectionsSlice";
import api from "../api/axios";
import toast from "react-hot-toast";

/**
 * Mobile-first Connections view
 * - Single column stacked cards on mobile
 * - Grid on md+
 * - Big tappable buttons and proper spacing for mobile
 */

const Connections = () => {
  const [currentTab, setCurrentTab] = useState("Followers");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  // safe defaults in case store slice is not ready
  const {
    connections = [],
    pendingConnections = [],
    followers = [],
    following = [],
  } = useSelector((state) => state.connections || {});

  const dataArray = useMemo(
    () => [
      { label: "Followers", value: followers || [], icon: Users },
      { label: "Following", value: following || [], icon: UserCheck },
      { label: "Pending", value: pendingConnections || [], icon: UserRoundPen },
      { label: "Connections", value: connections || [], icon: UserPlus },
    ],
    [followers, following, pendingConnections, connections]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getToken()
      .then((token) => {
        if (!mounted) return;
        dispatch(fetchConnections(token));
      })
      .catch((err) => {
        console.warn("fetch connections token error", err);
        toast.error("Could not load connections");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnfollow = async (userId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/user/unfollow",
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || "Unfollowed");
        dispatch(fetchConnections(token));
      } else {
        toast.error(data.message || "Could not unfollow");
      }
    } catch (error) {
      toast.error(error?.message || "Request failed");
    }
  };

  const acceptConnection = async (userId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/user/accept",
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || "Connection accepted");
        dispatch(fetchConnections(token));
      } else {
        toast.error(data.message || "Could not accept");
      }
    } catch (error) {
      toast.error(error?.message || "Request failed");
    }
  };

  // active list for current tab (always non-null array)
  const activeList = useMemo(
    () => dataArray.find((d) => d.label === currentTab)?.value || [],
    [dataArray, currentTab]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Connections</h1>
          <p className="text-sm text-slate-600 mt-1">Manage your network — quick actions below.</p>
        </div>

        {/* Counts - horizontal scroll on mobile */}
        <div className="mb-4">
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1">
            {dataArray.map((item) => (
              <button
                key={item.label}
                onClick={() => setCurrentTab(item.label)}
                className={`min-w-[110px] shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border ${
                  currentTab === item.label ? "bg-white border-slate-200 shadow" : "bg-white border-slate-100"
                }`}
                aria-pressed={currentTab === item.label}
              >
                <item.icon className="w-5 h-5 text-slate-600" />
                <div className="text-sm font-semibold text-slate-900">{(item.value || []).length}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs (secondary) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-md p-1 shadow-sm">
            {dataArray.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setCurrentTab(tab.label)}
                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition ${
                  currentTab === tab.label ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow">
                  <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
                    <div className="mt-2 h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeList.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-slate-600">
              No {currentTab.toLowerCase()} yet.
            </div>
          ) : (
            // Mobile: single column list. Desktop: 2-column grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((user) => {
                // defensive checks for fields
                const id = user?._id || user?.id || user;
                const profile_picture = user?.profile_picture || user?.avatar || "/default-avatar.png";
                const full_name = user?.full_name || user?.name || "Unknown";
                const username = user?.username || user?.handle || "unknown";
                const bio = (user?.bio && String(user.bio)) || "";

                return (
                  <article
                    key={id}
                    className="w-full flex gap-4 items-start p-4 bg-white rounded-lg shadow-sm"
                  >
                    <img
                      src={profile_picture}
                      alt={full_name}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{full_name}</p>
                          <p className="text-xs text-slate-500">@{username}</p>
                        </div>

                        <div className="text-right">
                          {/* small contextual label (optional) */}
                          {currentTab === "Pending" && (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{bio.slice(0, 80)}</p>

                      {/* Actions — stack on mobile, inline on wider screens */}
                      <div className="mt-3 grid grid-cols-1 sm:auto-rows-min sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate(`/profile/${id}`)}
                          className="w-full py-2 px-3 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm active:scale-95 transition"
                        >
                          View Profile
                        </button>

                        {/* Contextual actions */}
                        {currentTab === "Following" && (
                          <button
                            onClick={() => handleUnfollow(id)}
                            className="w-full py-2 px-3 rounded-md bg-slate-100 text-sm hover:bg-slate-200"
                          >
                            Unfollow
                          </button>
                        )}

                        {currentTab === "Pending" && (
                          <button
                            onClick={() => acceptConnection(id)}
                            className="w-full py-2 px-3 rounded-md bg-slate-100 text-sm hover:bg-slate-200"
                          >
                            Accept
                          </button>
                        )}

                        {currentTab === "Connections" && (
                          <button
                            onClick={() => navigate(`/messages/${id}`)}
                            className="w-full py-2 px-3 rounded-md bg-slate-100 text-sm hover:bg-slate-200 flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Message
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;
