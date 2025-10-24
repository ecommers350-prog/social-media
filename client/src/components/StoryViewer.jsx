import React, { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";

const StoryViewer = ({ viewStory, setViewStory }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer = null;
    let progressInterval = null;

    if (viewStory && viewStory.media_type !== "video") {
      setProgress(0);

      const duration = 10000; // 10s
      const tick = 100;
      let elapsed = 0;

      progressInterval = setInterval(() => {
        elapsed += tick;
        const pct = Math.min(100, (elapsed / duration) * 100);
        setProgress(pct);
        if (pct >= 100) {
          clearInterval(progressInterval);
        }
      }, tick);

      timer = setTimeout(() => {
        setViewStory(null);
      }, duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [viewStory, setViewStory]);

  const handleClose = () => {
    setViewStory(null);
  };

  if (!viewStory) return null;

  const renderContent = () => {
    switch (viewStory.media_type) {
      case "image":
        return (
          <img
            src={viewStory.media_url}
            alt={viewStory.alt || "story image"}
            className="max-w-full max-h-screen object-contain"
          />
        );
      case "video":
        return (
          <video
            onEnded={() => setViewStory(null)}
            src={viewStory.media_url}
            className="max-h-screen w-auto"
            controls
            autoPlay
          />
        );
      case "text":
        return (
          <div className="w-full h-full flex items-center justify-center p-8 text-white text-2xl text-center">
            {viewStory.content}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 h-screen z-[110] flex items-center justify-center"
      style={{
        backgroundColor:
          viewStory.media_type === "text"
            ? viewStory.background_Color || "#000000"
            : "rgba(0,0,0,0.9)",
      }}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
        <div
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* User Info - Top Left */}
      <div className="absolute top-4 left-4 flex items-center space-x-3 p-2 px-4 sm:p-4 sm:px-8 backdrop-blur-2xl rounded bg-black/50">
        <img
          src={viewStory.user?.profile_picture}
          alt={viewStory.user?.full_name || "user"}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white"
        />
        <div className="text-white font-medium flex items-center gap-1">
          <span>{viewStory.user?.full_name}</span>
          <BadgeCheck size={18} />
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        aria-label="Close story"
        className="absolute top-4 right-4 text-white text-3xl font-bold focus:outline-none"
      >
        <X className="w-8 h-8 hover:scale-110 transition cursor-pointer" />
      </button>

      {/* Content Wrapper */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default StoryViewer;