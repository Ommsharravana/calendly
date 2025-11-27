const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateToken, hashPassword, comparePassword, authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/security');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post(
  '/login',
  authLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      logger.warn(`Failed login attempt for email: ${email}`);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    logger.info(`User logged in: ${email}`);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: config.isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT id, email, name, created_at, last_login FROM users WHERE id = ?').get(req.userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json(user);
  })
);

/**
 * PUT /api/auth/password
 * Change password
 */
router.put(
  '/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      throw new AppError('Current and new password are required', 400, 'VALIDATION_ERROR');
    }

    if (new_password.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValid = await comparePassword(current_password, user.password_hash);

    if (!isValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.userId);

    logger.info(`Password changed for user: ${user.email}`);

    res.json({ message: 'Password updated successfully' });
  })
);

/**
 * POST /api/auth/setup
 * Initial setup - create first admin user (only works if no users exist)
 */
router.post(
  '/setup',
  asyncHandler(async (req, res) => {
    // Check if any users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

    if (userCount.count > 0) {
      throw new AppError('Setup already completed', 400, 'SETUP_COMPLETED');
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email, passwordHash, name || 'Admin');

    // Generate token
    const token = generateToken(userId);

    logger.info(`Initial admin user created: ${email}`);

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: config.isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Admin user created successfully',
      token,
      user: {
        id: userId,
        email,
        name: name || 'Admin',
      },
    });
  })
);

/**
 * GET /api/auth/status
 * Check if setup is needed
 */
router.get('/status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  res.json({
    setupRequired: userCount.count === 0,
    authenticated: !!req.cookies?.token,
  });
});

module.exports = router;
