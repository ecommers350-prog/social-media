import React from "react";

/**
 * Simple, normal loading screen
 * - centered spinner
 * - optional loading text
 */
const NormalLoading = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-700">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />

      {/* Label */}
      <p className="mt-4 text-sm font-medium tracking-wide">Loading...</p>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NormalLoading;
