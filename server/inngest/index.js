import { Inngest } from "inngest";
import User from "../models/User.js";
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Create a client to send and receive events
export const inngest = new Inngest({ id: "Creative-Clan" });

// Helper function to ensure MongoDB connection
const ensureDbConnection = async () => {
    if (mongoose.connection.readyState !== 1) {
        const uri = `${process.env.MONGODB_URL}/pingup`;
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 50
        });
    }
};

// Inngest Function to save user data to database
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event, step }) => {
        // Ensure DB connection in a separate step
        await step.run('ensure-db-connection', async () => {
            await ensureDbConnection();
        });

        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        
        // Generate username in a separate step
        const username = await step.run('generate-username', async () => {
            let baseUsername = email_addresses[0].email_address.split('@')[0];
            const existingUser = await User.findOne({ username: baseUsername });
            return existingUser ? 
                `${baseUsername}${Math.floor(Math.random() * 10000)}` : 
                baseUsername;
        });

        // Create user in a separate step
        return await step.run('create-user', async () => {
            const userData = {
                _id: id,
                email: email_addresses[0].email_address,
                full_name: first_name + " " + last_name,
                profile_picture: image_url,
                username
            };
            
            const user = await User.create(userData);
            return { success: true, userId: user._id };
        });
    }
);

// Inngest Function to Update user data in database
const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event, step }) => {
        await step.run('ensure-db-connection', async () => {
            await ensureDbConnection();
        });

        const { id, first_name, last_name, email_addresses, image_url } = event.data;
        
        return await step.run('update-user', async () => {
            const updatedUserData = {
                email: email_addresses[0].email_address,
                full_name: first_name + " " + last_name,
                profile_picture: image_url,
            };
            
            const user = await User.findByIdAndUpdate(id, updatedUserData, { new: true });
            return { success: true, userId: user._id };
        });
    }
);

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event, step }) => {
        await step.run('ensure-db-connection', async () => {
            await ensureDbConnection();
        });

        const { id } = event.data;
        
        return await step.run('delete-user', async () => {
            await User.findByIdAndDelete(id);
            return { success: true, userId: id };
        });
    }
);

// Export the functions array
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
];