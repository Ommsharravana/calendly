const express = require('express');
const router = express.Router();
const db = require('../database');

// Get default availability (event_type_id is NULL)
router.get('/', (req, res) => {
  try {
    const availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id IS NULL ORDER BY day_of_week
    `).all();
    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get availability for a specific event type
router.get('/event-type/:eventTypeId', (req, res) => {
  try {
    const { eventTypeId } = req.params;

    // First check if event type has custom availability
    let availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id = ? ORDER BY day_of_week
    `).all(eventTypeId);

    // If no custom availability, return default
    if (availability.length === 0) {
      availability = db.prepare(`
        SELECT * FROM availability WHERE event_type_id IS NULL ORDER BY day_of_week
      `).all();
    }

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update default availability
router.put('/', (req, res) => {
  try {
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule array is required' });
    }

    // Delete existing default availability
    db.prepare('DELETE FROM availability WHERE event_type_id IS NULL').run();

    // Insert new availability
    const insertStmt = db.prepare(`
      INSERT INTO availability (event_type_id, day_of_week, start_time, end_time, is_available)
      VALUES (NULL, ?, ?, ?, ?)
    `);

    for (const slot of schedule) {
      insertStmt.run(slot.day_of_week, slot.start_time, slot.end_time, slot.is_available ? 1 : 0);
    }

    const availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id IS NULL ORDER BY day_of_week
    `).all();

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update availability for a specific event type
router.put('/event-type/:eventTypeId', (req, res) => {
  try {
    const { eventTypeId } = req.params;
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule array is required' });
    }

    // Verify event type exists
    const eventType = db.prepare('SELECT id FROM event_types WHERE id = ?').get(eventTypeId);
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Delete existing availability for this event type
    db.prepare('DELETE FROM availability WHERE event_type_id = ?').run(eventTypeId);

    // Insert new availability
    const insertStmt = db.prepare(`
      INSERT INTO availability (event_type_id, day_of_week, start_time, end_time, is_available)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const slot of schedule) {
      insertStmt.run(eventTypeId, slot.day_of_week, slot.start_time, slot.end_time, slot.is_available ? 1 : 0);
    }

    const availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id = ? ORDER BY day_of_week
    `).all(eventTypeId);

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get availability overrides (date-specific)
router.get('/overrides', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM availability_overrides';
    const params = [];

    if (start_date && end_date) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date';

    const overrides = db.prepare(query).all(...params);
    res.json(overrides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create availability override
router.post('/overrides', (req, res) => {
  try {
    const { date, start_time, end_time, is_available, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Delete existing override for this date
    db.prepare('DELETE FROM availability_overrides WHERE date = ?').run(date);

    const stmt = db.prepare(`
      INSERT INTO availability_overrides (date, start_time, end_time, is_available, reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(date, start_time, end_time, is_available ? 1 : 0, reason);

    const override = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(override);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete availability override
router.delete('/overrides/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Override not found' });
    }

    db.prepare('DELETE FROM availability_overrides WHERE id = ?').run(id);
    res.json({ message: 'Override deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
