// src/api/reels.js
import api from "./axios";

/**
 * Reels API helpers.
 * Each function expects a token string (Bearer token) when required.
 * If you call these from components that use Clerk's getToken(), pass the token there.
 */

export const fetchReels = (page = 1, limit = 6, token) =>
  api.get("/api/reels", {
    params: { page, limit },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

export const fetchReel = (id, token) =>
  api.get(`/api/reels/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

export const likeReel = (reelId, token) =>
  api.post(
    "/api/reel/like",
    { reelId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const shareReel = (reelId, token) =>
  api.post(
    "/api/reel/share",
    { reelId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const commentReel = (reelId, content, token) =>
  api.post(
    "/api/reel/comment",
    { reelId, content },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const fetchComments = (reelId, page = 1, limit = 20, token) =>
  api.get(`/api/reels/${reelId}/comments`, {
    params: { page, limit },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

export const toggleSaveReel = (reelId, token) =>
  api.post(
    "/api/reel/save",
    { reelId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
