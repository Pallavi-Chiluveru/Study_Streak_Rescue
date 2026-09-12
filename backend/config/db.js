const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studystreakrescue');
    console.log('MongoDB connected.');
  } catch (error) {
    console.error('MongoDB connection unavailable.');
    // We don't exit process so server can still function with memory fallback if needed
  }
};

module.exports = connectDB;
