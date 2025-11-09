import React, { useEffect, useMemo, useState } from 'react';
import { Bell, UserPlus, UserCheck, Heart, MessageSquare, Camera, Users } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ Local axios (safe for Vite)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  withCredentials: true,
});

const SectionTitle = ({ children }) => (
  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mt-6 mb-2">
    {children}
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-3 py-2">
    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-slate-200 rounded animate-pulse" />
      <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
    </div>
    <div className="h-8 w-24 rounded bg-slate-200 animate-pulse" />
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
      <Bell className="w-7 h-7 text-slate-500" />
    </div>
    <p className="mt-3 font-medium text-slate-800">No notifications yet</p>
    <p className="text-slate-500 text-sm">When something happens, you’ll see it here.</p>
  </div>
);

// Utility: relative grouping buckets like Instagram
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.floor((startOfDay(a) - startOfDay(b)) / 86400000);

function bucketByTime(notifs) {
  const now = new Date();
  const buckets = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  notifs.forEach((n) => {
    const t = n?.createdAt ? new Date(n.createdAt) : new Date();
    const diff = daysBetween(now, t); // 0 => same day, 1 => yesterday, 2..6 => this week, >=7 earlier
    if (diff === 0) buckets['Today'].push(n);
    else if (diff === 1) buckets['Yesterday'].push(n);
    else if (diff > 1 && diff < 7) buckets['This week'].push(n);
    else buckets['Earlier'].push(n);
  });

  // Remove empty buckets but keep order
  return Object.entries(buckets).filter(([, arr]) => arr.length > 0);
}

const NotificationRow = ({ n, onFollowBack, onAccept, onCancel }) => {
  const type = n?.type; // 'follow', 'like', 'comment', 'mention', 'request'
  const actor = n?.actor || {}; // {_id, username, full_name, avatar}
  const avatar =
    actor?.avatar ||
    actor?.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(actor?.full_name || actor?.username || 'User')}&background=E5E7EB&color=374151`;

  const fullName = actor?.full_name || actor?.name || actor?.username || 'User';
  const username = actor?.username || 'user';

  // Compose the primary line and icon like Instagram
  let icon = <Bell className="w-4 h-4 text-slate-500" />;
  let text = '';
  let cta = null;

  if (type === 'follow') {
    icon = <UserPlus className="w-4 h-4 text-slate-700" />;
    const isRequested = n?.requested === true; // if your API returns requested state
    const youFollow = n?.youFollow === true;   // if you already follow them
    text = (
      <>
        <span className="font-medium">{username}</span> started following you.
      </>
    );
    if (youFollow) {
      cta = (
        <button
          disabled
          className="px-3 h-8 rounded-md text-xs bg-slate-100 text-slate-700"
        >
          Following
        </button>
      );
    } else if (isRequested) {
      cta = (
        <button
          onClick={() => onCancel?.(actor._id)}
          className="px-3 h-8 rounded-md text-xs bg-slate-100 hover:bg-slate-200 text-slate-900 active:scale-95 transition"
        >
          Requested
        </button>
      );
    } else {
      cta = (
        <button
          onClick={() => onFollowBack?.(actor._id)}
          className="px-3 h-8 rounded-md text-xs bg-slate-900 text-white active:scale-95 transition"
        >
          Follow back
        </button>
      );
    }
  } else if (type === 'request') {
    icon = <Users className="w-4 h-4 text-slate-700" />;
    text = (
      <>
        <span className="font-medium">{username}</span> requested to follow you.
      </>
    );
    cta = (
      <div className="flex gap-2">
        <button
          onClick={() => onAccept?.(actor._id)}
          className="px-3 h-8 rounded-md text-xs bg-slate-900 text-white active:scale-95 transition"
        >
          Confirm
        </button>
        <button
          onClick={() => onCancel?.(actor._id)}
          className="px-3 h-8 rounded-md text-xs bg-slate-100 hover:bg-slate-200 text-slate-900 active:scale-95 transition"
        >
          Delete
        </button>
      </div>
    );
  } else if (type === 'like') {
    icon = <Heart className="w-4 h-4 text-slate-700" />;
    text = (
      <>
        <span className="font-medium">{username}</span> liked your post.
      </>
    );
  } else if (type === 'comment') {
    icon = <MessageSquare className="w-4 h-4 text-slate-700" />;
    text = (
      <>
        <span className="font-medium">{username}</span> commented: “{n?.snippet || 'Nice!'}”
      </>
    );
  } else if (type === 'mention') {
    icon = <Camera className="w-4 h-4 text-slate-700" />;
    text = (
      <>
        <span className="font-medium">{username}</span> mentioned you in a post.
      </>
    );
  } else {
    text = (
      <>
        <span className="font-medium">{username}</span> did something.
      </>
    );
  }

  // Relative time text like "2h", "3d"
  const time = (() => {
    const d = n?.createdAt ? new Date(n.createdAt) : new Date();
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 60) return `${m || 1}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d2 = Math.floor(h / 24);
    if (d2 < 7) return `${d2}d`;
    const w = Math.floor(d2 / 7);
    return `${w}w`;
  })();

  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-md">
      <img
        src={avatar}
        alt={`${fullName} avatar`}
        className="w-10 h-10 rounded-full object-cover"
        onError={(e) => {
          e.currentTarget.src =
            'https://api.dicebear.com/8.x/initials/svg?seed=User&backgroundType=gradientLinear';
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate flex items-center gap-2">
          {icon}
          <span className="truncate">{text}</span>
          <span className="text-slate-500 text-xs shrink-0">{time}</span>
        </div>
        {n?.meta && (
          <div className="text-xs text-slate-500 truncate">{n.meta}</div>
        )}
      </div>
      {cta}
    </div>
  );
};

export default function Notifications() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Expect an array of { _id, type, actor, createdAt, meta, requested, youFollow }
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFollowBack = async (userId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        '/api/user/follow',
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        toast.success('Followed');
        load();
      } else {
        toast.error(data?.message || 'Could not follow back');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Follow back failed');
    }
  };

  const onAccept = async (userId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        '/api/user/accept',
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        toast.success('Request accepted');
        load();
      } else {
        toast.error(data?.message || 'Could not accept');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Accept failed');
    }
  };

  const onCancel = async (userId) => {
    // cancel follow request OR delete request (adjust endpoint if different)
    try {
      const token = await getToken();
      const { data } = await api.post(
        '/api/user/cancel-request',
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.success) {
        toast.success('Request updated');
        load();
      } else {
        toast.error(data?.message || 'Could not update request');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Update failed');
    }
  };

  const sections = useMemo(() => bucketByTime(items), [items]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl w-full px-3 sm:px-6 py-4 sm:py-6">
        {/* Header like Instagram */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
          <button
            onClick={load}
            className="text-xs px-3 h-8 bg-slate-900 text-white rounded-md active:scale-95"
          >
            Refresh
          </button>
        </div>

        {/* “Follow requests” pill like Instagram */}
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm">
            <Users className="w-4 h-4" />
            Follow requests
          </button>
        </div>

        <div className="bg-white rounded-xl shadow">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="py-2">
              {sections.map(([title, arr]) => (
                <div key={title} className="mb-2">
                  <SectionTitle>{title}</SectionTitle>
                  <div className="divide-y">
                    {arr.map((n) => (
                      <NotificationRow
                        key={n._id}
                        n={n}
                        onFollowBack={onFollowBack}
                        onAccept={onAccept}
                        onCancel={onCancel}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spacer for mobile bottom bars */}
        <div className="h-16" />
      </div>
    </div>
  );
}
