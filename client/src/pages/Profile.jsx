// src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import UserProfileInfo from "../components/UserProfileInfo";
import moment from "moment";
import ProfileModal from "../components/ProfileModal";
import PostCard from "../components/PostCard";
import { PlusCircle, MoreVertical, LogOut, Users } from "lucide-react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import { fetchUser } from "../features/user/userSlice";
import { fetchConnections } from "../features/connections/connectionsSlice";

// helper: avoid passing empty string to <img src="">
const safeUrl = (u) => (typeof u === "string" && u.trim() !== "" ? u : null);

// Detect Mongo ObjectId
const isMongoId = (s) => typeof s === "string" && /^[a-f\d]{24}$/i.test(s);

// Resolve the id your backend understands
const getFollowTargetId = (u) => {
  if (!u) return null;
  if (isMongoId(u._id)) return u._id;
  if (isMongoId(u.id)) return u.id;
  if (u.mongoId && isMongoId(u.mongoId)) return u.mongoId;
  if (typeof u.clerkId === "string") return u.clerkId;
  if (typeof u.clerk_id === "string") return u.clerk_id;
  if (typeof u._id === "string") return u._id;
  return null;
};

// Extract only *user* IDs from common following shapes
const extractFollowingUserIds = (u) => {
  if (!u) return [];
  const base =
    Array.isArray(u.following) ? u.following :
    Array.isArray(u.followingIds) ? u.followingIds :
    Array.isArray(u.following_users) ? u.following_users :
    [];

  const ids = [];
  for (const item of base) {
    if (!item) continue;
    if (typeof item === "string") {
      ids.push(item);
      continue;
    }
    if (typeof item === "object") {
      if (item.userId) { ids.push(String(item.userId)); continue; }
      if (item._id) { ids.push(String(item._id)); continue; }
      if (item.id) { ids.push(String(item.id)); continue; }
      if (item.targetId) { ids.push(String(item.targetId)); continue; }
    }
  }
  return Array.from(new Set(ids));
};

const Profile = () => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { profileId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);
  const dispatch = useDispatch();

  // Close mobile menu
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/");
    } catch {
      toast.error("Sign out failed");
    } finally {
      setMenuOpen(false);
    }
  };

  const fetchProfile = async (id) => {
    try {
      // Try to get a token if available
      let token;
      try {
        token = await getToken?.();
      } catch (error) {
        toast.error(error.message)
        token = null;
      }

      if (!token) {
        // If you want to require login for viewing profiles, keep this.
        // Otherwise you could allow public view by calling endpoint without auth.
        toast.error("Please log in to view profiles");
        return;
      }

      const { data } = await api.post(
        "/api/user/profile",
        { profileId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        const profile = data.profile || data.Profile || null;
        setUser(profile);
        setPosts(Array.isArray(data.posts) ? data.posts : (Array.isArray(data.post) ? data.post : []));
      } else {
        toast.error(data.message || "Failed to fetch profile");
      }
    } catch (error) {
      console.error("fetchProfile error:", error);
      toast.error(error?.response?.data?.message || "Error fetching profile");
    }
  };

  // Fetch profile when currentUser available or profileId changes
  useEffect(() => {
    // If profileId present try fetch; if not, prefer currentUser
    const idToFetch = profileId || currentUser?._id;
    if (!idToFetch) return;
    fetchProfile(idToFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, currentUser?._id]);

  // Derive "already following" from Redux/current user
  useEffect(() => {
    if (!user || !currentUser) return;

    const targetId = getFollowTargetId(user);
    const myFollowing =
      currentUser.followingIds ||
      currentUser.following ||
      [];

    const toStr = (v) => (v != null ? String(v) : "");
    const amIFollowing = myFollowing.some(
      (fid) =>
        toStr(fid) === toStr(user._id) ||
        toStr(fid) === toStr(targetId)
    );

    setIsFollowing(Boolean(amIFollowing));
  }, [user, currentUser]);

  if (!user) return <Loading />;

  const isOwnProfile = !profileId || profileId === currentUser?._id;

  const goCreatePost = () => {
    navigate("/create-post");
  };
  const goConnections = () => navigate("/connections");

  // FOLLOW
  const handleFollow = async (userId) => {
    try {
      setFollowLoading(true);
      const token = await getToken();
      if (!token) {
        toast.error("Please log in");
        return;
      }
      const { data } = await api.post(
        "/api/user/follow",
        { id: userId, follow: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setIsFollowing(true);
        toast.success(data.message || "Followed");
        dispatch(fetchUser(token));
        dispatch(fetchConnections(token));
      } else {
        toast.error(data.message || "Could not follow");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Follow failed");
    } finally {
      setFollowLoading(false);
    }
  };

  // UNFOLLOW
  const handleUnfollow = async (userId) => {
    try {
      setFollowLoading(true);
      const tokenNow = await getToken();
      if (!tokenNow) {
        toast.error("Please log in");
        return;
      }
      const { data } = await api.post(
        "/api/user/unfollow",
        { id: userId },
        { headers: { Authorization: `Bearer ${tokenNow}` } }
      );
      if (data.success) {
        setIsFollowing(false);
        toast.success(data.message || "Unfollowed");
        dispatch(fetchConnections(tokenNow));
        dispatch(fetchUser(tokenNow));
      } else {
        toast.error(data.message || "Unfollow failed");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Unfollow failed");
    } finally {
      setFollowLoading(false);
    }
  };

  const targetId = getFollowTargetId(user);

  // compute user-only following count for header
  const followingUsersCount = extractFollowingUserIds(user).length;
  const userForHeader = { ...user, followingCount: followingUsersCount };

  return (
    <div className="relative h-full overflow-y-auto bg-gray-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden relative">
          <div className="relative">
            {safeUrl(user.cover_photo) ? (
              <img
                src={safeUrl(user.cover_photo)}
                alt="cover"
                className="w-full h-40 sm:h-48 md:h-56 object-cover"
              />
            ) : (
              <div className="w-full h-40 sm:h-48 md:h-56 bg-gradient-to-r from-blue-400 to-purple-500" />
            )}

            {/* Desktop actions */}
            <div className="hidden md:flex absolute right-6 top-6 items-center gap-3">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={goConnections}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-800 hover:bg-slate-50 shadow focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Connections"
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Connections</span>
                  </button>
                  <button
                    onClick={goCreatePost}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Create Post"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span className="font-medium">Create Post</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    isFollowing
                      ? handleUnfollow(targetId)
                      : handleFollow(targetId)
                  }
                  disabled={followLoading || !targetId}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow focus:outline-none focus:ring-2 ${
                    isFollowing
                      ? "bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-200"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300"
                  }`}
                  aria-label={isFollowing ? "Unfollow" : "Follow"}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>

            {/* Mobile menu (hidden on other profiles) */}
            {isOwnProfile && (
              <div className="md:hidden absolute right-2 top-2">
                <button
                  ref={menuBtnRef}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Open menu"
                  className="p-1.5 rounded-full bg-white/90 backdrop-blur shadow active:scale-95"
                >
                  <MoreVertical className="w-5 h-5 text-slate-700" />
                </button>

                {menuOpen && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="absolute right-0 mt-1 w-40 rounded-xl bg-white shadow-lg ring-1 ring-black/5 py-1 z-20 text-sm"
                  >
                    <button
                      onClick={() => {
                        goConnections();
                        setMenuOpen(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Connections
                    </button>
                    <button
                      onClick={() => {
                        goCreatePost();
                        setMenuOpen(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    >
                      Create post
                    </button>
                    <button
                      onClick={handleSignOut}
                      role="menuitem"
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            <div className="relative">
              <UserProfileInfo
                user={userForHeader}
                posts={posts}
                profileId={profileId}
                setShowEdit={setShowEdit}
              />

              {/* Mobile actions */}
              {isOwnProfile ? (
                <div className="md:hidden px-3 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    
                  </div>
                </div>
              ) : (
                <div className="md:hidden px-3 pb-3">
                  <button
                    onClick={() =>
                      isFollowing
                        ? handleUnfollow(targetId)
                        : handleFollow(targetId)
                    }
                    disabled={followLoading || !targetId}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium shadow focus:outline-none focus:ring-2 ${
                      isFollowing
                        ? "bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300"
                    }`}
                    aria-label={isFollowing ? "Unfollow" : "Follow"}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 sm:mt-6 bg-gray-100 pb-6 sm:pb-8">
            <div className="bg-white rounded-lg sm:rounded-xl shadow p-0.5 sm:p-1 flex max-w-xs sm:max-w-md mx-auto">
              {["posts", "media", "likes"].map((tab) => (
                <button
                  onClick={() => setActiveTab(tab)}
                  key={tab}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === "posts" && (
              <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3 sm:gap-6">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard key={post._id ?? post.id} post={post} />
                  ))
                ) : (
                  <div className="text-gray-500 text-sm py-8 sm:py-10">No posts yet.</div>
                )}
              </div>
            )}

            {activeTab === "media" && (
              <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-4 sm:justify-center max-w-6xl mx-auto px-2">
                {posts.flatMap((post) =>
                  (Array.isArray(post.image_urls) ? post.image_urls : []).map((image, index) => {
                    const url = safeUrl(image);
                    if (!url) return null;
                    return (
                      <a
                        key={`${post._id ?? post.id}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative overflow-hidden rounded-lg w-full aspect-square sm:w-64 sm:h-40"
                      >
                        <img
                          src={url}
                          alt={`media-${index}`}
                          className="w-full h-full object-cover"
                        />
                        <p className="hidden sm:block absolute bottom-0 right-0 text-xs p-1 px-3 backdrop-blur-xl text-white opacity-0 hover:opacity-100 transition duration-300">
                          Posted {moment(post.createdAt ?? post.created_at).fromNow()}
                        </p>
                      </a>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "likes" && (
              <div className="text-center text-gray-600 py-8 sm:py-10 text-sm">
                Likes feature coming soon.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && <ProfileModal setShowEdit={setShowEdit} />}
    </div>
  );
};

export default Profile;
