const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Get default availability (public - needed for booking)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id IS NULL ORDER BY day_of_week
    `).all();
    res.json(availability);
  })
);

// Get availability for a specific event type (public)
router.get(
  '/event-type/:eventTypeId',
  asyncHandler(async (req, res) => {
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
  })
);

// Update default availability (admin only)
router.put(
  '/',
  authenticate,
  validate(schemas.updateAvailability),
  asyncHandler(async (req, res) => {
    const { schedule } = req.body;

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

    logger.info('Default availability updated');

    res.json(availability);
  })
);

// Update availability for a specific event type (admin only)
router.put(
  '/event-type/:eventTypeId',
  authenticate,
  validate(schemas.updateAvailability),
  asyncHandler(async (req, res) => {
    const { eventTypeId } = req.params;
    const { schedule } = req.body;

    // Verify event type exists
    const eventType = db.prepare('SELECT id FROM event_types WHERE id = ?').get(eventTypeId);
    if (!eventType) {
      throw new AppError('Event type not found', 404, 'NOT_FOUND');
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

    logger.info(`Availability updated for event type: ${eventTypeId}`);

    res.json(availability);
  })
);

// Get availability overrides (admin only)
router.get(
  '/overrides',
  authenticate,
  asyncHandler(async (req, res) => {
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
  })
);

// Create availability override (admin only)
router.post(
  '/overrides',
  authenticate,
  validate(schemas.createOverride),
  asyncHandler(async (req, res) => {
    const { date, start_time, end_time, is_available, reason } = req.body;

    // Delete existing override for this date
    db.prepare('DELETE FROM availability_overrides WHERE date = ?').run(date);

    const stmt = db.prepare(`
      INSERT INTO availability_overrides (date, start_time, end_time, is_available, reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(date, start_time, end_time, is_available ? 1 : 0, reason);

    const override = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(result.lastInsertRowid);

    logger.info(`Availability override created for date: ${date}`);

    res.status(201).json(override);
  })
);

// Delete availability override (admin only)
router.delete(
  '/overrides/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM availability_overrides WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Override not found', 404, 'NOT_FOUND');
    }

    db.prepare('DELETE FROM availability_overrides WHERE id = ?').run(id);

    logger.info(`Availability override deleted: ${id}`);

    res.json({ message: 'Override deleted successfully' });
  })
);

module.exports = router;
