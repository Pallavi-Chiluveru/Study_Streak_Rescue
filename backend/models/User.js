const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password']
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  streak: {
    type: Number,
    default: 0
  },
  xp: {
    type: Number,
    default: 0
  },
  totalFocusMinutes: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
