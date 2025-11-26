const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// Get all event types
router.get('/', (req, res) => {
  try {
    const eventTypes = db.prepare(`
      SELECT * FROM event_types ORDER BY created_at DESC
    `).all();
    res.json(eventTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active event types (for public booking page)
router.get('/active', (req, res) => {
  try {
    const eventTypes = db.prepare(`
      SELECT * FROM event_types WHERE is_active = 1 ORDER BY duration ASC
    `).all();
    res.json(eventTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event type by slug
router.get('/slug/:slug', (req, res) => {
  try {
    const eventType = db.prepare(`
      SELECT * FROM event_types WHERE slug = ? AND is_active = 1
    `).get(req.params.slug);

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    res.json(eventType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event type by ID
router.get('/:id', (req, res) => {
  try {
    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(req.params.id);

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    res.json(eventType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event type
router.post('/', (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      duration = 30,
      color = '#0066FF',
      location = 'Google Meet',
      buffer_before = 0,
      buffer_after = 0,
      max_bookings_per_day
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existing = db.prepare('SELECT id FROM event_types WHERE slug = ?').get(slug);
    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO event_types (id, name, slug, description, duration, color, location, buffer_before, buffer_after, max_bookings_per_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, slug, description, duration, color, location, buffer_before, buffer_after, max_bookings_per_day);

    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    res.status(201).json(eventType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event type
router.put('/:id', (req, res) => {
  try {
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
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Check if new slug conflicts with another event type
    if (slug && slug !== existing.slug) {
      const slugConflict = db.prepare('SELECT id FROM event_types WHERE slug = ? AND id != ?').get(slug, id);
      if (slugConflict) {
        return res.status(400).json({ error: 'Slug already exists' });
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
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event type
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    db.prepare('DELETE FROM event_types WHERE id = ?').run(id);
    res.json({ message: 'Event type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
