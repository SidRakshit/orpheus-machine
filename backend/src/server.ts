import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
import fs from 'fs';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import musicRoutes from './routes/musicRoutes';
import healthRoutes from './routes/healthRoutes';
import { initializeDatabase } from './services/database';
// import { initializeRedis } from './services/redis'; // Temporarily disabled
import { scheduleCleanupTasks } from './utils/cleanup';




const app = express();
const PORT = process.env.PORT || 3001;

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, '../temp'),
    path.join(__dirname, '../output'),
    path.join(__dirname, '../logs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api', musicRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Orpheus Machine Backend',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health'
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start server
const startServer = async () => {
  try {
    // Create directories
    createDirectories();
    
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection established');
    
    // Initialize Redis connection (temporarily disabled)
    // await initializeRedis();
    // logger.info('Redis connection established');
    
    // Schedule cleanup tasks
    scheduleCleanupTasks();
    logger.info('Cleanup tasks scheduled');
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`🎵 Orpheus Machine Backend running on port ${PORT}`);
      logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      logger.info(`🔒 Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || '10'} requests per ${Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 60000)} minutes`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer(); 