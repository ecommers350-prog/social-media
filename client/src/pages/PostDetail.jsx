// src/pages/PostDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Loading from "../components/Loading";
import PostCard from "../components/PostCard";
import CommentBox from "../components/CommentBox";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const PostDetail = () => {
  const { postId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = async (id) => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await api.get(`/api/post/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data && data.post) {
        setPost(data.post);
      } else {
        toast.error(data?.message || "Post not found");
      }
    } catch (err) {
      console.error("Fetch post error:", err);
      toast.error(err?.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) fetchPost(postId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // callback passed to PostCard — called by PostCard after successful delete
  const handlePostDeleted = (deletedPostId) => {
    // If we are viewing the same post, navigate back to feed (or wherever you want)
    if (deletedPostId === postId) {
      toast.success("Post deleted");
      navigate("/", { replace: true });
    } else {
      // otherwise, refetch or remove from local state (defensive)
      setPost((p) => (p && p._id === deletedPostId ? null : p));
    }
  };

  if (loading) return <Loading />;

  if (!post) return <div className="p-6">Post not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* pass onDelete to PostCard so it can notify us after deletion */}
        <PostCard post={post} onDelete={handlePostDeleted} />
        <div className="mt-6">
          <CommentBox postId={postId} />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
