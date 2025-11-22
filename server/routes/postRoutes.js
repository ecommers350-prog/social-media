import express from 'express';
import { upload } from '../configs/multer.js';
import { protect } from '../middlewares/auth.js';
import { addPost, getFeedPost, likePost, deletePost, getPostComments, addPostComment } from '../controllers/postController.js';

const postRouter = express.Router()

postRouter.post("/add", upload.array("images", 4), protect, addPost);
postRouter.get("/feed", protect, getFeedPost);
postRouter.post("/like", protect, likePost);
postRouter.delete("/:id", protect, deletePost);
postRouter.get("/:id/comments", protect, getPostComments);
postRouter.post("/:id/comments", protect, addPostComment);


export default postRouter;