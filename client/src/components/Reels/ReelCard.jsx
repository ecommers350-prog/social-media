import React, { useEffect, useRef, useState } from 'react';
import { http } from '../../api/http';
import { useAuth } from '@clerk/clerk-react';
import { Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReelCard = ({ reel }) => {
  const videoRef = useRef(null);
  const [likes, setLikes] = useState(reel.likeCount || 0);
  const [commentText, setCommentText] = useState('');
  const { getToken } = useAuth();

  // Autoplay/pause when in view
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0.7 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const withAuth = async () => {
    const headers = {};
    const token = await getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    return { headers };
  };

  const like = async () => {
    try {
      const cfg = await withAuth();
      const { data } = await http.post(`/api/reels/${reel._id}/like`, {}, cfg);
      if (data?.success) setLikes(data.likeCount);
      else toast.error(data?.message || 'Failed to like');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const comment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const cfg = await withAuth();
      const { data } = await http.post(
        `/api/reels/${reel._id}/comment`,
        { text: commentText.trim() },
        cfg
      );
      if (data?.success) {
        toast.success('Comment added');
        setCommentText('');
      } else toast.error(data?.message || 'Failed to comment');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow bg-black relative aspect-[9/16]">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        controls={false}
        loop
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {/* Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 text-white bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-sm opacity-90">{reel.caption}</p>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={like} className="inline-flex items-center gap-1">
            <Heart className="w-5 h-5" />
            <span className="text-sm">{likes}</span>
          </button>
        </div>
        <form onSubmit={comment} className="mt-2 flex items-center gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-white/15 rounded px-2 py-1 text-sm placeholder-white/60"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 bg-white/20 rounded px-2 py-1"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Post</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReelCard;
