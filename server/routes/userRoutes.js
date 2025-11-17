// server/routes/userRoutes.js
import express from "express";

// Controller exports (make sure these names match your controllers)
import {
  getUserData,
  updateUserData,
  discoverUsers,
  followUser,
  unfollowUser,
  sendConnectionRequest,
  getUserConnections,
  acceptConnectionRequest,
  getUserProfiles,
} from "../controllers/userController.js";

// auth middleware that sets req.user or provides req.auth()
import { protect } from "../middlewares/auth.js";

// multer upload instance (expects export named `upload` from configs/multer.js)
import { upload } from "../configs/multer.js";

// other controllers/middlewares you referenced
import { getUserRecentMessages } from "../controllers/messageController.js";

const router = express.Router();

// Protected: get current user data
router.get("/data", protect, getUserData);

// Protected: update profile (auth first, then parse multipart/form-data)
router.post(
  "/update",
  protect,
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  updateUserData
);

// Protected: discover users
router.post("/discover", protect, discoverUsers);

// Protected: follow / unfollow
router.post("/follow", protect, followUser);
router.post("/unfollow", protect, unfollowUser);

// Protected: send connection request (frontend expects POST /api/user/connect)
router.post("/connect", protect, sendConnectionRequest);

// Protected: accept connection
router.post("/accept", protect, acceptConnectionRequest);

// Protected: list connections
router.get("/connections", protect, getUserConnections);

// Protected: get a user profile (frontend calls POST /api/user/profile)
router.post("/profile", protect, getUserProfiles);

// Protected: recent messages endpoint (if used)
router.get("/recent-messages", protect, getUserRecentMessages);

export default router;
