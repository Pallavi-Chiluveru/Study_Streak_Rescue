const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config({ quiet: true });

// Email is optional for startup; failures are reported without provider details.
void require('./services/emailService').initializeEmailService();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];

app.use(cors({
  origin: allowedOrigins.length === 0
    ? true
    : (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      const error = new Error('Origin is not allowed by CORS');
      error.statusCode = 403;
      return callback(error);
    },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Study Streak Rescue Backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/gamification', require('./routes/gamificationRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('Study Streak Rescue Server listening.');
  require('./services/notificationScheduler').startNotificationScheduler();
});

