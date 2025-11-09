import React, { useState } from 'react';
import { http } from '../../api/http';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

const UploadReelForm = ({ onUploaded }) => {
  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { getToken } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!video) return toast.error('Please select a video');

    const form = new FormData();
    form.append('video', video);
    form.append('caption', caption);

    setSubmitting(true);
    try {
      const headers = {};
      const token = await getToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      const { data } = await http.post('/api/reels', form, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });

      if (data?.success) {
        toast.success('Reel uploaded!');
        setVideo(null);
        setCaption('');
        onUploaded?.(data.reel);
      } else {
        toast.error(data?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 bg-white rounded-xl shadow">
      <h3 className="font-semibold text-slate-800">Upload Reel</h3>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideo(e.target.files?.[0] || null)}
        className="block w-full text-sm"
      />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption…"
        className="w-full border rounded p-2 text-sm"
        rows={2}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2 rounded bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-70"
      >
        {submitting ? 'Uploading…' : 'Post Reel'}
      </button>
    </form>
  );
};

export default UploadReelForm;
