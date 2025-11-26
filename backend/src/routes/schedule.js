const express = require('express');
const router = express.Router();
const db = require('../database');
const { format, addDays, parseISO, startOfDay, endOfDay, addMinutes, isBefore, isAfter, isEqual } = require('date-fns');
const { formatInTimeZone, toZonedTime } = require('date-fns-tz');

// Get available time slots for a specific event type and date range
router.get('/available-slots/:eventTypeSlug', (req, res) => {
  try {
    const { eventTypeSlug } = req.params;
    const { start_date, end_date, timezone = 'America/New_York' } = req.query;

    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    // Get event type
    const eventType = db.prepare(`
      SELECT * FROM event_types WHERE slug = ? AND is_active = 1
    `).get(eventTypeSlug);

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Get availability (custom or default)
    let availability = db.prepare(`
      SELECT * FROM availability WHERE event_type_id = ? ORDER BY day_of_week
    `).all(eventType.id);

    if (availability.length === 0) {
      availability = db.prepare(`
        SELECT * FROM availability WHERE event_type_id IS NULL ORDER BY day_of_week
      `).all();
    }

    // Get date range
    const startDate = parseISO(start_date);
    const endDateParsed = end_date ? parseISO(end_date) : addDays(startDate, 30);

    // Get all confirmed bookings in the date range
    const bookings = db.prepare(`
      SELECT start_time, end_time FROM bookings
      WHERE status = 'confirmed'
        AND DATE(start_time) >= DATE(?)
        AND DATE(start_time) <= DATE(?)
    `).all(start_date, format(endDateParsed, 'yyyy-MM-dd'));

    // Get date overrides
    const overrides = db.prepare(`
      SELECT * FROM availability_overrides
      WHERE date >= ? AND date <= ?
    `).all(start_date, format(endDateParsed, 'yyyy-MM-dd'));

    const overrideMap = {};
    overrides.forEach(o => {
      overrideMap[o.date] = o;
    });

    // Generate available slots
    const slots = {};
    let currentDate = startDate;

    while (isBefore(currentDate, endDateParsed) || isEqual(currentDate, endDateParsed)) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();

      // Check for date override
      const override = overrideMap[dateStr];

      if (override) {
        if (!override.is_available) {
          // Day is blocked
          slots[dateStr] = [];
          currentDate = addDays(currentDate, 1);
          continue;
        }
        // Use override times
        const daySlots = generateTimeSlots(
          dateStr,
          override.start_time,
          override.end_time,
          eventType.duration,
          eventType.buffer_before || 0,
          eventType.buffer_after || 0,
          bookings,
          timezone
        );
        slots[dateStr] = daySlots;
      } else {
        // Use regular availability
        const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

        if (!dayAvailability || !dayAvailability.is_available) {
          slots[dateStr] = [];
        } else {
          const daySlots = generateTimeSlots(
            dateStr,
            dayAvailability.start_time,
            dayAvailability.end_time,
            eventType.duration,
            eventType.buffer_before || 0,
            eventType.buffer_after || 0,
            bookings,
            timezone
          );
          slots[dateStr] = daySlots;
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    res.json({
      event_type: eventType,
      slots,
      timezone
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate time slots for a day
function generateTimeSlots(dateStr, startTime, endTime, duration, bufferBefore, bufferAfter, bookings, timezone) {
  const slots = [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentTime = new Date(`${dateStr}T${startTime}:00`);
  const dayEnd = new Date(`${dateStr}T${endTime}:00`);
  const now = new Date();

  // Don't show slots in the past
  const minTime = new Date(Math.max(currentTime.getTime(), now.getTime()));

  // Round up to next slot interval
  const slotInterval = duration + bufferAfter;
  const msPerSlot = slotInterval * 60 * 1000;
  const dayStartMs = currentTime.getTime();

  if (minTime > currentTime) {
    const elapsedMs = minTime.getTime() - dayStartMs;
    const slotsElapsed = Math.ceil(elapsedMs / msPerSlot);
    currentTime = new Date(dayStartMs + slotsElapsed * msPerSlot);
  }

  while (currentTime < dayEnd) {
    const slotStart = new Date(currentTime.getTime() + bufferBefore * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    // Check if slot end is within day bounds
    if (slotEnd > dayEnd) {
      break;
    }

    // Check if slot conflicts with any booking
    const slotStartStr = slotStart.toISOString();
    const slotEndStr = slotEnd.toISOString();

    const hasConflict = bookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);

      // Account for buffers
      const bufferedStart = new Date(bookingStart.getTime() - bufferBefore * 60 * 1000);
      const bufferedEnd = new Date(bookingEnd.getTime() + bufferAfter * 60 * 1000);

      return (slotStart < bufferedEnd && slotEnd > bufferedStart);
    });

    if (!hasConflict && slotStart > now) {
      slots.push({
        start: slotStartStr,
        end: slotEndStr,
        formatted: format(slotStart, 'h:mm a')
      });
    }

    currentTime = addMinutes(currentTime, slotInterval);
  }

  return slots;
}

// Get calendar data (bookings + availability for calendar view)
router.get('/calendar', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Get bookings
    const bookings = db.prepare(`
      SELECT b.*, et.name as event_type_name, et.color as event_type_color, et.duration
      FROM bookings b
      JOIN event_types et ON b.event_type_id = et.id
      WHERE DATE(b.start_time) >= DATE(?)
        AND DATE(b.start_time) <= DATE(?)
      ORDER BY b.start_time ASC
    `).all(start_date, end_date);

    // Get overrides
    const overrides = db.prepare(`
      SELECT * FROM availability_overrides
      WHERE date >= ? AND date <= ?
    `).all(start_date, end_date);

    res.json({ bookings, overrides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
