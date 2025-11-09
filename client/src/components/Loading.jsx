// src/components/Loading.jsx
import React from "react";

/**
 * Instagram-like skeleton for feed:
 * - Stories row (circular avatars)
 * - A few feed cards with avatar, username, image, actions, caption lines
 *
 * Props:
 *  - stories (number) : how many story bubbles (default 8)
 *  - posts (number)   : how many post skeletons (default 3)
 */
const Loading = ({ stories = 8, posts = 3 }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Stories row */}
      <div className="px-3 pt-3 border-b">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3">
          {Array.from({ length: stories }).map((_, i) => (
            <div key={i} className="flex flex-col items-center flex-none">
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-pink-500 to-yellow-400">
                <div className="w-16 h-16 rounded-full bg-gray-200 shimmer" />
              </div>
              <div className="w-12 h-2 mt-2 rounded bg-gray-200 shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Feed cards */}
      <div className="max-w-[600px] mx-auto">
        {Array.from({ length: posts }).map((_, i) => (
          <article key={i} className="border-b">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 shimmer" />
              <div className="flex-1">
                <div className="w-28 h-3 rounded bg-gray-200 shimmer" />
                <div className="w-16 h-2 mt-2 rounded bg-gray-200 shimmer" />
              </div>
              <div className="w-5 h-5 rounded bg-gray-200 shimmer" />
            </div>

            {/* Media */}
            <div className="w-full aspect-square bg-gray-200 shimmer" />

            {/* Actions */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-6 h-6 rounded bg-gray-200 shimmer" />
              <div className="w-6 h-6 rounded bg-gray-200 shimmer" />
              <div className="w-6 h-6 rounded bg-gray-200 shimmer" />
              <div className="ml-auto w-6 h-6 rounded bg-gray-200 shimmer" />
            </div>

            {/* Meta / caption */}
            <div className="px-3 pb-4 space-y-2">
              <div className="w-24 h-3 rounded bg-gray-200 shimmer" />
              <div className="w-48 h-3 rounded bg-gray-200 shimmer" />
              <div className="w-32 h-3 rounded bg-gray-200 shimmer" />
            </div>
          </article>
        ))}
      </div>

      {/* Local CSS for shimmer */}
      <style>{`
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        .shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.6) 50%,
            rgba(255,255,255,0) 100%
          );
          animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        /* hide scrollbars for stories row */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Loading;
