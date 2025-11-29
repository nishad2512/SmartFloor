import mongoose from 'mongoose';

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfloor';

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

export default connectDB;