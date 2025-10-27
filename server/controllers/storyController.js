import fs from 'fs';
import imagekit from '../configs/imageKit.js';
import User from '../models/User.js';
import Story from '../models/Story.js'; // ✅ Added import
import { inngest } from '../inngest/index.js';

// Add User Story
export const addUserStory = async (req, res) => {
    try {
        const { userId } = req.auth; // ✅ or req.user depending on your auth middleware
        const { content, media_type, background_color } = req.body;
        const media = req.file;
        let media_url = '';

        // Upload media to ImageKit if present
        if (media && (media_type === 'image' || media_type === 'video')) {
            const fileBuffer = fs.readFileSync(media.path);
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: media.originalname,
            });
            media_url = response.url;
        }

        // Create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color,
        });

        // schedule story deleted after 24 hours
        await inngest.send({
            name: 'app/story.delete',
            data: { storyId: story._id } 
        })

        res.json({ success: true, story });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get User Stories
export const getStories = async (req, res) => {
    try {
        const { userId } = req.auth;
        const user = await User.findById(userId);

        // Include user's own stories + connections + following
        const userIds = [userId, ...user.connections, ...user.following];

        const stories = await Story.find({
            user: { $in: userIds }, // ✅ Fixed query syntax
        }).populate('user').sort({ createdAt: -1 });

        res.json({ success: true, stories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
