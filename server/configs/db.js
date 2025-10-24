import mongoose from 'mongoose';

const connectDB = async () => {

    try {
        mongoose.connections.on('connecterd', ()=> console.log('Database connected'))
        await mongoose.connect(`${process.env.MONGODB_URL}/pingup`)
    } catch (error) {
        
    }
}

export default connectDB;