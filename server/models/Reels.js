import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

const reelSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // integrate Clerk user id here
    caption: { type: String, maxlength: 2000 },
    videoUrl: { type: String, required: true },
    likeCount: { type: Number, default: 0 },
    comments: [commentSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Reel', reelSchema);
