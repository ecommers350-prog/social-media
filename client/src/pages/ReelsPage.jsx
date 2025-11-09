import React, { useEffect, useState } from 'react';
import { http } from '../api/http';
import UploadReelForm from '../components/Reels/UploadReelForm';
import ReelCard from '../components/Reels/ReelCard';
import toast from 'react-hot-toast';

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/api/reels');
      if (data?.success) setReels(data.reels || []);
      else toast.error(data?.message || 'Failed to fetch reels');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Reels</h1>

        <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Left: upload form */}
          <UploadReelForm
            onUploaded={(reel) => setReels((r) => [reel, ...r])}
          />

          {/* Right: reels list */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-slate-200 aspect-[9/16] animate-pulse" />
                ))}
              </div>
            ) : reels.length === 0 ? (
              <div className="p-10 bg-white rounded-xl shadow text-center text-slate-600">
                No reels yet. Be the first to post!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reels.map((reel) => (
                  <ReelCard key={reel._id} reel={reel} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelsPage;
