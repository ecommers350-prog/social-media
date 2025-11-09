// src/pages/Reels.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  Pause,
  Play,
  Bookmark,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toggleSaveReel as apiToggleSaveReel } from "../api/reels";

const PAGE_SIZE = 6;

const Reels = () => {
  const { getToken } = useAuth();
  const currentUser = useSelector((s) => s.user.value);
  const navigate = useNavigate();

  const [reels, setReels] = useState([]); // list of reels
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // refs for playing control
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const playingRef = useRef(null); // currently playing video element

  useEffect(() => {
    fetchReels(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch reels page
  const fetchReels = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await api.get("/api/reels", {
        params: { page: pageToLoad, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data && data.reels) {
        if (pageToLoad === 1) setReels(data.reels);
        else setReels((p) => [...p, ...data.reels]);

        if (data.reels.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);
      } else {
        toast.error(data?.message || "Failed to load reels");
      }
      setPage(pageToLoad);
    } catch (err) {
      console.error("Error loading reels:", err);
      toast.error(err?.message || "Failed to load reels");
    } finally {
      setLoading(false);
    }
  };

  // Intersection observer to autoplay visible video
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: [0.6], // 60% visible
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector("video");
        if (!video) return;

        if (entry.isIntersecting) {
          // pause previously playing
          if (playingRef.current && playingRef.current !== video) {
            try {
              playingRef.current.pause();
            } catch (error) {
              // ignore
              // eslint-disable-next-line no-console
              console.warn("pause error", error);
            }
          }
          video.play().catch(() => {});
          playingRef.current = video;
        } else {
          try {
            video.pause();
          } catch(error) {
            toast.error(error.message);
          }
        }
      });
    }, options);

    const nodes = containerRef.current?.querySelectorAll(".reel-card") || [];
    nodes.forEach((n) => observerRef.current.observe(n));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [reels]);

  // load next page on scroll near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loading) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.offsetHeight;
      if (docHeight - scrollBottom < 1200) {
        fetchReels(page + 1);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, page, getToken]);

  // toggle like optimistic
  const toggleLike = async (reelId) => {
    if (!currentUser) {
      toast.error("Log in to like reels");
      return;
    }

    // optimistic
    setReels((prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const liked = Array.isArray(r.likes) ? r.likes.includes(currentUser._id) : false;
        return {
          ...r,
          likes: liked ? r.likes.filter((id) => id !== currentUser._id) : [...(r.likes || []), currentUser._id],
        };
      })
    );

    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/reel/like",
        { reelId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data?.success) {
        toast.error(data?.message || "Like failed");
        // revert by refetching current page (simple approach)
        fetchReels(1);
      }
    } catch (err) {
      console.error("Like failed", err);
      toast.error("Failed to like");
      fetchReels(1);
    }
  };

  const handleShare = async (reelId) => {
    try {
      const token = await getToken();
      await api.post(
        "/api/reel/share",
        { reelId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const url = `${window.location.origin}/reels/${reelId}`;
      if (navigator.clipboard) await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      // optional: update shares_count optimistically
      setReels((prev) => prev.map((r) => (r._id === reelId ? { ...r, shares_count: (r.shares_count || 0) + 1 } : r)));
    } catch (err) {
      console.error("Share failed", err);
      toast.error("Share failed");
    }
  };

  // toggle save/bookmark
  const handleToggleSave = async (reelId) => {
    if (!currentUser) {
      toast.error("Log in to save");
      return;
    }
    // optimistic toggle in UI
    setReels((prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const hasSaved = Array.isArray(r.saved_by) ? r.saved_by.includes(currentUser._id) : false;
        return {
          ...r,
          saved_by: hasSaved ? (r.saved_by || []).filter((id) => id !== currentUser._id) : [...(r.saved_by || []), currentUser._id],
        };
      })
    );

    try {
      const token = await getToken();
      const { data } = await apiToggleSaveReel(reelId, token);
      if (data?.success) {
        toast.success(data.saved ? "Saved" : "Removed from saved");
        // ensure server state matches client
        setReels((prev) => prev.map((r) => (r._id === reelId ? { ...r, saved_by: data.saved ? [...(r.saved_by || []), currentUser._id] : (r.saved_by || []).filter(id => id !== currentUser._id) } : r)));
      } else {
        toast.error(data?.message || "Save failed");
        fetchReels(1);
      }
    } catch (err) {
      console.error("Save failed", err);
      toast.error("Save failed");
      fetchReels(1);
    }
  };

  // utility: pause/play toggle for clicked video
  const togglePlayPause = (videoEl) => {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play().catch(() => {});
      playingRef.current = videoEl;
    } else {
      videoEl.pause();
    }
  };

  // keyboard shortcuts: Space to toggle, ArrowUp/Down to navigate
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      if (e.key === " ") {
        e.preventDefault();
        const v = playingRef.current;
        if (v) {
          togglePlayPause(v);
        }
      } else if (e.key === "ArrowUp") {
        window.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
      } else if (e.key === "ArrowDown") {
        window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Video card component (inline)
  const ReelCard = ({ reel }) => {
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [lastTap, setLastTap] = useState(0);

    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      return () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
      };
    }, []);

    // double-tap to like (mobile)
    const handleTap = () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // double tap
        toggleLike(reel._id);
        // you can add heart animation here
      }
      setLastTap(now);
    };

    const isLiked = Array.isArray(reel.likes) && currentUser ? reel.likes.includes(currentUser._id) : false;
    const isSaved = Array.isArray(reel.saved_by) && currentUser ? reel.saved_by.includes(currentUser._id) : false;

    return (
      <article className="reel-card snap-start h-screen w-full relative flex items-center justify-center bg-black text-white">
        <video
          ref={videoRef}
          src={reel.video_url}
          className="w-full h-full object-cover"
          playsInline
          muted={muted}
          loop
          onClick={() => {
            handleTap();
            togglePlayPause(videoRef.current);
          }}
          onDoubleClick={() => toggleLike(reel._id)}
          preload="metadata"
        />

        {/* Right action column */}
        <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 z-20">
          <button
            className="flex flex-col items-center"
            onClick={() => toggleLike(reel._id)}
            aria-label="Like"
          >
            <Heart className={`w-9 h-9 ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
            <span className="text-xs mt-1">{(reel.likes || []).length}</span>
          </button>

          <button
            className="flex flex-col items-center"
            onClick={() => navigate(`/reel/${reel._id}`)}
            aria-label="Comments"
          >
            <MessageCircle className="w-9 h-9 text-white" />
            <span className="text-xs mt-1">{reel.comments_count ?? 0}</span>
          </button>

          <button
            className="flex flex-col items-center"
            onClick={() => handleShare(reel._id)}
            aria-label="Share"
          >
            <Share2 className="w-9 h-9 text-white" />
            <span className="text-xs mt-1">{reel.shares_count ?? 0}</span>
          </button>

          <button
            className="flex flex-col items-center"
            onClick={() => handleToggleSave(reel._id)}
            aria-label="Save"
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? "text-yellow-400" : "text-white"}`} />
            <span className="text-xs mt-1">{/* optional saved count */}</span>
          </button>
        </div>

        {/* Bottom left: user info & caption */}
        <div className="absolute left-4 bottom-10 z-20 max-w-[70%]">
          <div className="flex items-center gap-3 mb-2">
            <img src={reel.user?.profile_picture} alt={reel.user?.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
            <div>
              <div className="font-semibold text-sm">{reel.user?.full_name}</div>
              <div className="text-xs text-gray-200">@{reel.user?.username}</div>
            </div>
          </div>
          {reel.caption && <div className="text-sm text-white/90 line-clamp-3">{reel.caption}</div>}
        </div>

        {/* top-left controls: mute/unmute & play/pause small */}
        <div className="absolute left-4 top-6 z-20 flex items-center gap-2">
          <button
            onClick={() => {
              setMuted((m) => !m);
              const v = videoRef.current;
              if (v) v.muted = !v.muted;
            }}
            className="bg-black/40 rounded-full p-2"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <Volume2 className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={() => {
              const v = videoRef.current;
              togglePlayPause(v);
            }}
            className="bg-black/40 rounded-full p-2"
            aria-label="Play/Pause"
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          </button>
        </div>
      </article>
    );
  };

  return (
    <main className="reels-page w-full h-full snap-y snap-mandatory overflow-y-scroll" ref={containerRef}>
      <div className="w-full h-full">
        {reels.length === 0 && loading ? (
          <div className="h-screen flex items-center justify-center">
            <div className="text-slate-500">Loading reels...</div>
          </div>
        ) : (
          reels.map((r) => <ReelCard key={r._id} reel={r} />)
        )}

        {loading && (
          <div className="py-6 flex items-center justify-center">
            <div className="text-slate-600">Loading more...</div>
          </div>
        )}

        {!hasMore && (
          <div className="py-6 flex items-center justify-center text-sm text-slate-500">No more reels</div>
        )}
      </div>
    </main>
  );
};

export default Reels;
