const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Get all event types (admin only)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const eventTypes = db.prepare(`
      SELECT * FROM event_types ORDER BY created_at DESC
    `).all();
    res.json(eventTypes);
  })
);

// Get active event types (public - for booking page)
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const eventTypes = db.prepare(`
      SELECT id, name, slug, description, duration, color, location
      FROM event_types
      WHERE is_active = 1
      ORDER BY duration ASC
    `).all();
    res.json(eventTypes);
  })
);

// Get single event type by slug (public)
router.get(
  '/slug/:slug',
  validate(schemas.slugParam),
  asyncHandler(async (req, res) => {
    const eventType = db.prepare(`
      SELECT id, name, slug, description, duration, color, location
      FROM event_types
      WHERE slug = ? AND is_active = 1
    `).get(req.params.slug);

    if (!eventType) {
      throw new AppError('Event type not found', 404, 'NOT_FOUND');
    }

    res.json(eventType);
  })
);

// Get single event type by ID (admin only)
router.get(
  '/:id',
  authenticate,
  validate(schemas.idParam),
  asyncHandler(async (req, res) => {
    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(req.params.id);

    if (!eventType) {
      throw new AppError('Event type not found', 404, 'NOT_FOUND');
    }

    res.json(eventType);
  })
);

// Create event type (admin only)
router.post(
  '/',
  authenticate,
  validate(schemas.createEventType),
  asyncHandler(async (req, res) => {
    const {
      name,
      slug,
      description,
      duration,
      color,
      location,
      buffer_before,
      buffer_after,
      max_bookings_per_day
    } = req.body;

    // Check if slug already exists
    const existing = db.prepare('SELECT id FROM event_types WHERE slug = ?').get(slug);
    if (existing) {
      throw new AppError('Slug already exists', 400, 'SLUG_EXISTS');
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO event_types (id, name, slug, description, duration, color, location, buffer_before, buffer_after, max_bookings_per_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, slug, description, duration, color, location, buffer_before, buffer_after, max_bookings_per_day);

    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);

    logger.info(`Event type created: ${name} (${slug})`);

    res.status(201).json(eventType);
  })
);

// Update event type (admin only)
router.put(
  '/:id',
  authenticate,
  validate(schemas.updateEventType),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      duration,
      color,
      location,
      is_active,
      buffer_before,
      buffer_after,
      max_bookings_per_day
    } = req.body;

    // Check if event type exists
    const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Event type not found', 404, 'NOT_FOUND');
    }

    // Check if new slug conflicts with another event type
    if (slug && slug !== existing.slug) {
      const slugConflict = db.prepare('SELECT id FROM event_types WHERE slug = ? AND id != ?').get(slug, id);
      if (slugConflict) {
        throw new AppError('Slug already exists', 400, 'SLUG_EXISTS');
      }
    }

    const stmt = db.prepare(`
      UPDATE event_types
      SET name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          duration = COALESCE(?, duration),
          color = COALESCE(?, color),
          location = COALESCE(?, location),
          is_active = COALESCE(?, is_active),
          buffer_before = COALESCE(?, buffer_before),
          buffer_after = COALESCE(?, buffer_after),
          max_bookings_per_day = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(name, slug, description, duration, color, location, is_active, buffer_before, buffer_after, max_bookings_per_day, id);

    const updated = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);

    logger.info(`Event type updated: ${id}`);

    res.json(updated);
  })
);

// Delete event type (admin only)
router.delete(
  '/:id',
  authenticate,
  validate(schemas.idParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Event type not found', 404, 'NOT_FOUND');
    }

    db.prepare('DELETE FROM event_types WHERE id = ?').run(id);

    logger.info(`Event type deleted: ${id}`);

    res.json({ message: 'Event type deleted successfully' });
  })
);

module.exports = router;
