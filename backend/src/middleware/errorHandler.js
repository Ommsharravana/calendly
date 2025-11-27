const logger = require('../utils/logger');
const config = require('../config');

/**
 * User-friendly error messages for non-technical users
 */
const userFriendlyMessages = {
  // Authentication errors
  UNAUTHORIZED: 'Please log in to continue.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect. Please try again.',
  INVALID_TOKEN: 'Your session has expired. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',

  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_TIME: 'The selected time slot is no longer available. Please choose another time.',
  MISSING_FIELDS: 'Please fill in all required fields.',

  // Booking errors
  SLOT_UNAVAILABLE: 'Sorry, this time slot has already been booked. Please choose another time.',
  BOOKING_NOT_FOUND: 'We couldn\'t find this booking. It may have been cancelled.',
  INVALID_CANCEL_TOKEN: 'This cancellation link is invalid or has expired.',
  ALREADY_CANCELLED: 'This booking has already been cancelled.',

  // Event type errors
  EVENT_TYPE_NOT_FOUND: 'This meeting type doesn\'t exist or has been disabled.',
  SLUG_EXISTS: 'A meeting type with this URL already exists. Please choose a different URL.',

  // General errors
  NOT_FOUND: 'The page you\'re looking for doesn\'t exist.',
  CONSTRAINT_ERROR: 'This action conflicts with existing data. Please try again.',
  CSRF_ERROR: 'Your session may have expired. Please refresh the page and try again.',
  INVALID_JSON: 'There was a problem with your request. Please refresh the page and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
  SETUP_COMPLETED: 'An admin account already exists. Please log in instead.',
};

/**
 * Get user-friendly message for an error code
 */
const getFriendlyMessage = (code, defaultMessage) => {
  return userFriendlyMessages[code] || defaultMessage;
};

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    // Store the technical message and provide a friendly one
    this.technicalMessage = message;
    this.friendlyMessage = getFriendlyMessage(code, message);

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

  // Get user-friendly message
  const friendlyMessage = getFriendlyMessage(code, message);

  // Build response
  const response = {
    error: friendlyMessage,
    code,
  };

  // Include technical message in development
  if (config.isDev) {
    response.technicalError = message;
    if (statusCode >= 500) {
      response.stack = err.stack;
    }
  }

  // Include validation details if available (make them user-friendly)
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
