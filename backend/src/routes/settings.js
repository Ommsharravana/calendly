const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Get settings (public - needed for booking page)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = db.prepare('SELECT id, name, email, timezone, welcome_message FROM settings WHERE id = 1').get();
    res.json(settings);
  })
);

// Update settings (admin only)
router.put(
  '/',
  authenticate,
  validate(schemas.updateSettings),
  asyncHandler(async (req, res) => {
    const { name, email, timezone, welcome_message } = req.body;

    const stmt = db.prepare(`
      UPDATE settings
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          timezone = COALESCE(?, timezone),
          welcome_message = COALESCE(?, welcome_message),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    stmt.run(name, email, timezone, welcome_message);

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(updated);
  })
);

module.exports = router;
