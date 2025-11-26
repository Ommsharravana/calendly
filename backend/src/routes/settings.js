const express = require('express');
const router = express.Router();
const db = require('../database');

// Get settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put('/', (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
