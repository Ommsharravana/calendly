const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Load config first (loads .env)
const config = require('./config');
const logger = require('./utils/logger');

// Initialize database (creates tables and default data)
const db = require('./database');
const { closeDatabase } = require('./database');

// Import middleware
const {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  csrfTokenHandler,
  conditionalCsrf,
} = require('./middleware/security');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Request logging
app.use(morgan(config.isDev ? 'dev' : 'combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// CSRF Protection (conditional based on route)
app.use(conditionalCsrf);

// CSRF Token endpoint
app.get('/api/csrf-token', csrfTokenHandler);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/event-types', require('./routes/eventTypes'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/schedule', require('./routes/schedule'));

// Serve static files in production
if (config.isProd) {
  const staticPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`Server running on http://localhost:${config.server.port}`);
  logger.info(`Environment: ${config.env}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during server close:', err);
      process.exit(1);
    }

    logger.info('HTTP server closed');

    // Close database connection
    closeDatabase();
    logger.info('Database connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app; // For testing
