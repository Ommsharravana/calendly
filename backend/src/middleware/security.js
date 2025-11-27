const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { doubleCsrf } = require('csrf-csrf');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Helmet security headers
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for calendar integrations
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS configuration
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (config.cors.origins.includes(origin) || config.isDev) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // 24 hours
});

/**
 * Rate limiting - general API
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Stricter rate limiting for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too many login attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Rate limiting for booking creation (prevent spam)
 */
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bookings per hour per IP
  message: {
    error: 'Too many booking attempts, please try again later',
    code: 'BOOKING_RATE_LIMIT_EXCEEDED',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Booking rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * CSRF Protection
 */
const { generateToken: generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.csrf.secret,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: config.isProd ? 'strict' : 'lax',
    secure: config.isProd,
    path: '/',
  },
  size: 64,
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body._csrf;
  },
});

/**
 * CSRF token endpoint handler
 */
const csrfTokenHandler = (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
};

/**
 * Skip CSRF for certain routes (public booking, etc.)
 */
const conditionalCsrf = (req, res, next) => {
  // Skip CSRF for public booking endpoints (they don't have auth anyway)
  const publicPaths = [
    '/api/bookings',
    '/api/schedule/available-slots',
    '/api/event-types/active',
    '/api/event-types/slug',
    '/api/settings',
  ];

  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  const isGetRequest = req.method === 'GET';

  if (isGetRequest || (isPublicPath && req.method === 'POST' && req.path === '/api/bookings')) {
    return next();
  }

  // Apply CSRF protection for admin routes
  if (req.path.startsWith('/api/auth') && req.method === 'POST' && req.path === '/api/auth/login') {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
};

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  authLimiter,
  bookingLimiter,
  csrfTokenHandler,
  conditionalCsrf,
  doubleCsrfProtection,
};
