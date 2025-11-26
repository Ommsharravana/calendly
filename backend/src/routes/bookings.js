const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { sendBookingConfirmation, sendCancellationNotification } = require('../email');

// Get all bookings
router.get('/', (req, res) => {
  try {
    const { status, start_date, end_date, event_type_id } = req.query;

    let query = `
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (start_date) {
      query += ' AND DATE(b.start_time) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(b.start_time) <= ?';
      params.push(end_date);
    }

    if (event_type_id) {
      query += ' AND b.event_type_id = ?';
      params.push(event_type_id);
    }

    query += ' ORDER BY b.start_time ASC';

    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming bookings
router.get('/upcoming', (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.status = 'confirmed'
        AND b.start_time >= datetime('now')
      ORDER BY b.start_time ASC
      LIMIT 10
    `).all();

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single booking
router.get('/:id', (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration, et.location as event_type_location
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create booking
router.post('/', async (req, res) => {
  try {
    const {
      event_type_id,
      invitee_name,
      invitee_email,
      start_time,
      end_time,
      timezone,
      notes,
      location
    } = req.body;

    if (!event_type_id || !invitee_name || !invitee_email || !start_time || !end_time || !timezone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify event type exists and is active
    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ? AND is_active = 1').get(event_type_id);
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found or inactive' });
    }

    // Check for conflicting bookings
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE status = 'confirmed'
        AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))
    `).get(start_time, start_time, end_time, end_time, start_time, end_time);

    if (conflict) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }

    // Check max bookings per day
    if (eventType.max_bookings_per_day) {
      const date = start_time.split('T')[0];
      const dayBookings = db.prepare(`
        SELECT COUNT(*) as count FROM bookings
        WHERE event_type_id = ? AND DATE(start_time) = ? AND status = 'confirmed'
      `).get(event_type_id, date);

      if (dayBookings.count >= eventType.max_bookings_per_day) {
        return res.status(409).json({ error: 'Maximum bookings reached for this day' });
      }
    }

    const id = uuidv4();
    const bookingLocation = location || eventType.location;

    const stmt = db.prepare(`
      INSERT INTO bookings (id, event_type_id, invitee_name, invitee_email, start_time, end_time, timezone, notes, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, event_type_id, invitee_name, invitee_email, start_time, end_time, timezone, notes, bookingLocation);

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    // Get host settings for email
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    // Send confirmation emails (non-blocking)
    sendBookingConfirmation(booking, settings).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel booking
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const stmt = db.prepare(`
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(cancellation_reason, id);

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    // Get host settings for email
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    // Send cancellation notification (non-blocking)
    sendCancellationNotification(booking, settings).catch(err => {
      console.error('Failed to send cancellation email:', err);
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reschedule booking
router.put('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, timezone } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot reschedule a cancelled booking' });
    }

    // Check for conflicting bookings (excluding current booking)
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE status = 'confirmed'
        AND id != ?
        AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))
    `).get(id, start_time, start_time, end_time, end_time, start_time, end_time);

    if (conflict) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }

    const stmt = db.prepare(`
      UPDATE bookings
      SET start_time = ?,
          end_time = ?,
          timezone = COALESCE(?, timezone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(start_time, end_time, timezone, id);

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete booking (hard delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
