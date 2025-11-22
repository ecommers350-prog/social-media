import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import connectDB from './configs/db.js';
import { inngest, functions } from './inngest/index.js';
import { serve } from "inngest/express";
import userRouter from './routes/userRoutes.js';
import postRouter from './routes/postRoutes.js';
import storyRouter from './routes/storyRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import { clerkMiddleware} from '@clerk/express'
import router from './routes/postCommentsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import connectionsRouter from './routes/connections.js';
import messageRoutes from './routes/message.js';
import authMiddleware from './middleware/authMiddleware.js'


const app = express();

await connectDB();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware())

app.get('/', (req, res)=> res.send('Server is running...'));
app.use('/api/inngest', serve({ client: inngest, functions }));
app.use('/api/user', userRouter);
app.use('/api/post', postRouter);
app.use('/api/story', storyRouter);
app.use('/api/message', messageRouter);
app.use('/api/post', router);
app.use("/api/notifications", notificationRoutes);
app.use("/api/user", connectionsRouter);
app.use("/api/message", authMiddleware, messageRoutes);


const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`));