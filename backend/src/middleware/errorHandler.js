const logger = require('../utils/logger');
const config = require('../config');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Log the error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.userId,
    });
  } else {
    logger.warn('Client error:', {
      error: err.message,
      code,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'Database constraint violation';
    code = 'CONSTRAINT_ERROR';
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // CSRF error
  if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
    statusCode = 403;
    message = 'Invalid or missing CSRF token';
    code = 'CSRF_ERROR';
  }

  // Build response
  const response = {
    error: message,
    code,
  };

  // Include stack trace in development
  if (config.isDev && statusCode >= 500) {
    response.stack = err.stack;
  }

  // Include validation details if available
  if (err.details) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
