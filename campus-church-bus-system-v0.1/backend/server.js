const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route files
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const busRoutes = require('./routes/busRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const allocationRoutes = require('./routes/allocationRoutes');

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// HTTP Request logging (disable in test environment for cleaner test output)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/allocation', allocationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TPCM Ride API is running smoothly.',
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(async () => {
    try {
      const Bus = require('./models/Bus');
      const busCount = await Bus.countDocuments();
      if (busCount === 0) {
        console.log('[Server] Fresh database detected. Auto-seeding 9 buses, default admin, and trip...');
        const seedData = require('./utils/seedData');
        await seedData();
      }
    } catch (seedErr) {
      console.warn('[Server] Auto-seed notice:', seedErr.message);
    }

    server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 TPCM Ride Server Running!`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`======================================================\n`);
    });
  }).catch((err) => {
    console.error('Failed to start application:', err.message);
    process.exit(1);
  });
}

module.exports = { app, server };
