import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import UserProfileInfo from "../components/UserProfileInfo";
import moment from "moment";
import ProfileModal from "../components/ProfileModal";
import PostCard from "../components/PostCard"; // <- ensure this exists
import { PlusCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import api from "../api/axios";

const Profile = () => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const { profileId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const fetchUser = async (id) => {
    try {
      const token = await getToken?.();
      if (!token) {
        toast.error("Please log in to view profiles");
        return;
      }

      const { data } = await api.post(
        "/api/user/profiles",
        { profileId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setUser(data.profile || data.Profile || null);
        setPosts(data.posts || data.post || []);
      } else {
        toast.error(data.message || "Failed to fetch profile");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching profile");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUser(profileId || currentUser._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, currentUser]);

  if (!user) return <Loading />;

  const isOwnProfile = !profileId || profileId === currentUser?._id;

  return (
    <div className="relative h-full overflow-y-auto bg-gray-100 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
          <div>
            {user.cover_photo ? (
              <img
                src={user.cover_photo}
                alt="cover"
                className="w-full h-56 object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-gradient-to-r from-blue-400 to-purple-500" />
            )}

            {/* Desktop Create Post button (absolute top-right) */}
            {isOwnProfile && (
              <div className="hidden md:block absolute right-6 top-6">
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Create Post"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="font-medium">Create Post</span>
                </button>
              </div>
            )}

            {/* User Info Section */}
            <div className="relative">
              <UserProfileInfo
                user={user}
                posts={posts}
                profileId={profileId}
                setShowEdit={setShowEdit}
              />

              {/* Mobile Create Post button (below profile info) */}
              {isOwnProfile && (
                <div className="md:hidden px-4 pb-4">
                  <button
                    onClick={() => {
                      setShowCreatePost(true);
                      navigate('/create-post');
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    aria-label="Create Post"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Create Post
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 bg-gray-100 pb-8">
            <div className="bg-white rounded-xl shadow p-1 flex max-w-md mx-auto">
              {["posts", "media", "likes"].map((tab) => (
                <button
                  onClick={() => setActiveTab(tab)}
                  key={tab}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="mt-6 flex flex-col items-center gap-6 shadow">
                {posts.length > 0 ? (
                  posts.map((post) => <PostCard key={post._id} post={post} />)
                ) : (
                  <div className="text-gray-500 text-sm py-10">No posts yet.</div>
                )}
              </div>
            )}

            {/* Media Tab */}
            {activeTab === "media" && (
              <div className="flex flex-wrap mt-6 max-w-6xl gap-4 justify-center">
                {posts.flatMap((post) =>
                  (post.image_urls || []).map((image, index) => (
                    <a
                      key={`${post._id}-${index}`}
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group w-64 h-40 overflow-hidden rounded-lg"
                    >
                      <img
                        src={image}
                        alt={`media-${index}`}
                        className="w-full h-full object-cover"
                      />
                      <p className="absolute bottom-0 right-0 text-xs p-1 px-3 backdrop-blur-xl text-white opacity-0 group-hover:opacity-100 transition duration-300">
                        Posted {moment(post.createdAt).fromNow()}
                      </p>
                    </a>
                  ))
                )}
              </div>
            )}

            {/* Likes Tab (optional placeholder) */}
            {activeTab === "likes" && (
              <div className="text-center text-gray-600 py-10">
                Likes feature coming soon.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && <ProfileModal setShowEdit={setShowEdit} />}
      {showCreatePost && (
        <PostCard setShowCreate={setShowCreatePost} />
      )}
    </div>
  );
};

export default Profile;
