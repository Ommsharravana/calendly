const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { sendBookingConfirmation, sendCancellationNotification } = require('../email');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { bookingLimiter } = require('../middleware/security');
const { generateICalEvent, generateCancellationToken } = require('../utils/ical');
const logger = require('../utils/logger');

// Get all bookings (admin only)
router.get(
  '/',
  authenticate,
  validate(schemas.bookingsQuery),
  asyncHandler(async (req, res) => {
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
  })
);

// Get upcoming bookings (admin only)
router.get(
  '/upcoming',
  authenticate,
  asyncHandler(async (req, res) => {
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
  })
);

// Get single booking (admin or via cancellation token)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { token } = req.query;

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration, et.location as event_type_location
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    // If no token and no auth, hide sensitive data
    if (!token && !req.userId) {
      // Return limited info for public access
      return res.json({
        id: booking.id,
        event_type_name: booking.event_type_name,
        event_type_color: booking.event_type_color,
        duration: booking.duration,
        start_time: booking.start_time,
        end_time: booking.end_time,
        location: booking.location,
        status: booking.status,
      });
    }

    // Verify token if provided
    if (token && booking.cancellation_token !== token) {
      throw new AppError('Invalid cancellation token', 403, 'INVALID_TOKEN');
    }

    res.json(booking);
  })
);

// Get iCal file for booking
router.get(
  '/:id/ical',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { token } = req.query;

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    // Verify token for non-admin access
    if (!req.userId && token !== booking.cancellation_token) {
      throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    }

    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const icalContent = generateICalEvent(booking, settings);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${id}.ics"`);
    res.send(icalContent);
  })
);

// Create booking (public - with rate limiting)
router.post(
  '/',
  bookingLimiter,
  validate(schemas.createBooking),
  asyncHandler(async (req, res) => {
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

    // Verify event type exists and is active
    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ? AND is_active = 1').get(event_type_id);
    if (!eventType) {
      throw new AppError('Event type not found or inactive', 404, 'EVENT_TYPE_NOT_FOUND');
    }

    // Validate time slot is in the future
    if (new Date(start_time) <= new Date()) {
      throw new AppError('Cannot book time slots in the past', 400, 'INVALID_TIME');
    }

    // Check for conflicting bookings
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE status = 'confirmed'
        AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))
    `).get(start_time, start_time, end_time, end_time, start_time, end_time);

    if (conflict) {
      throw new AppError('Time slot is no longer available', 409, 'TIME_CONFLICT');
    }

    // Check max bookings per day
    if (eventType.max_bookings_per_day) {
      const date = start_time.split('T')[0];
      const dayBookings = db.prepare(`
        SELECT COUNT(*) as count FROM bookings
        WHERE event_type_id = ? AND DATE(start_time) = ? AND status = 'confirmed'
      `).get(event_type_id, date);

      if (dayBookings.count >= eventType.max_bookings_per_day) {
        throw new AppError('Maximum bookings reached for this day', 409, 'MAX_BOOKINGS_REACHED');
      }
    }

    const id = uuidv4();
    const bookingLocation = location || eventType.location;
    const cancellationToken = generateCancellationToken();

    const stmt = db.prepare(`
      INSERT INTO bookings (id, event_type_id, invitee_name, invitee_email, start_time, end_time, timezone, notes, location, cancellation_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, event_type_id, invitee_name, invitee_email, start_time, end_time, timezone, notes, bookingLocation, cancellationToken);

    const booking = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE b.id = ?
    `).get(id);

    // Get host settings for email
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    // Send confirmation emails (non-blocking)
    sendBookingConfirmation(booking, settings, cancellationToken).catch(err => {
      logger.error('Failed to send confirmation email:', err);
    });

    logger.info(`New booking created: ${id} for ${invitee_email}`);

    // Return booking with cancellation token (only time it's exposed)
    res.status(201).json({
      ...booking,
      cancellation_token: cancellationToken,
    });
  })
);

// Cancel booking via token (public)
router.post(
  '/:id/cancel-public',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { token, cancellation_reason } = req.body;

    if (!token) {
      throw new AppError('Cancellation token is required', 400, 'TOKEN_REQUIRED');
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (existing.cancellation_token !== token) {
      throw new AppError('Invalid cancellation token', 403, 'INVALID_TOKEN');
    }

    if (existing.status === 'cancelled') {
      throw new AppError('Booking is already cancelled', 400, 'ALREADY_CANCELLED');
    }

    const stmt = db.prepare(`
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(cancellation_reason || 'Cancelled by invitee', id);

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
      logger.error('Failed to send cancellation email:', err);
    });

    logger.info(`Booking cancelled by invitee: ${id}`);

    res.json(booking);
  })
);

// Cancel booking (admin only)
router.put(
  '/:id/cancel',
  authenticate,
  validate(schemas.cancelBooking),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (existing.status === 'cancelled') {
      throw new AppError('Booking is already cancelled', 400, 'ALREADY_CANCELLED');
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
      logger.error('Failed to send cancellation email:', err);
    });

    logger.info(`Booking cancelled by admin: ${id}`);

    res.json(booking);
  })
);

// Reschedule booking (admin only)
router.put(
  '/:id/reschedule',
  authenticate,
  validate(schemas.rescheduleBooking),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { start_time, end_time, timezone } = req.body;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    if (existing.status === 'cancelled') {
      throw new AppError('Cannot reschedule a cancelled booking', 400, 'CANNOT_RESCHEDULE');
    }

    // Check for conflicting bookings (excluding current booking)
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE status = 'confirmed'
        AND id != ?
        AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))
    `).get(id, start_time, start_time, end_time, end_time, start_time, end_time);

    if (conflict) {
      throw new AppError('Time slot is no longer available', 409, 'TIME_CONFLICT');
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

    logger.info(`Booking rescheduled: ${id}`);

    res.json(booking);
  })
);

// Delete booking (admin only)
router.delete(
  '/:id',
  authenticate,
  validate(schemas.idParam),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(id);

    logger.info(`Booking deleted: ${id}`);

    res.json({ message: 'Booking deleted successfully' });
  })
);

module.exports = router;
