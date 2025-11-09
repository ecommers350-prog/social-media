import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Reel from '../models/Reel.js';

const router = express.Router();

// --- Multer setup ---
const UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads', 'reels');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

// (Optional) Clerk auth middleware placeholder
// import { requireSession } from '@clerk/express';
// const withUser = requireSession(); // use and then access req.auth

// Create reel (multipart/form-data)
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Video is required' });
    const userId = (req.auth?.userId) || 'demo-user'; // replace with Clerk user id if using auth
    const caption = req.body.caption || '';

    const videoUrl = `/uploads/reels/${req.file.filename}`;

    const reel = await Reel.create({ userId, caption, videoUrl });
    return res.json({ success: true, reel });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// List reels (newest first)
router.get('/', async (_req, res) => {
  try {
    const reels = await Reel.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, reels });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Like reel (increments likeCount)
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findByIdAndUpdate(
      id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true, likeCount: reel.likeCount });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Comment on reel
router.post('/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });
    const userId = (req.auth?.userId) || 'demo-user';

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    reel.comments.push({ userId, text });
    await reel.save();
    res.json({ success: true, comments: reel.comments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
