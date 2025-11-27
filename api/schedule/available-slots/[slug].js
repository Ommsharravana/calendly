import { sql, initDb } from '../../_lib/db.js';
import { addDays, format, parseISO, startOfDay, addMinutes, isBefore, isAfter } from 'date-fns';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, date, days = '7' } = req.query;

  try {
    await initDb();

    // Get event type
    const eventTypeResult = await sql`
      SELECT et.*, u.id as owner_id FROM event_types et
      JOIN users u ON et.user_id = u.id
      WHERE et.slug = ${slug} AND et.is_active = true
    `;

    if (eventTypeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    const eventType = eventTypeResult.rows[0];
    const userId = eventType.owner_id;

    // Get availability
    const availabilityResult = await sql`
      SELECT * FROM availability WHERE user_id = ${userId}
    `;
    const availability = availabilityResult.rows;

    // Get existing bookings
    const startDate = date ? parseISO(date) : startOfDay(new Date());
    const endDate = addDays(startDate, parseInt(days));

    const bookingsResult = await sql`
      SELECT start_time, end_time FROM bookings
      WHERE event_type_id = ${eventType.id}
      AND status = 'confirmed'
      AND start_time >= ${startDate.toISOString()}
      AND start_time < ${endDate.toISOString()}
    `;
    const bookings = bookingsResult.rows;

    // Generate available slots
    const slots = [];
    const duration = eventType.duration;
    const bufferBefore = eventType.buffer_before || 0;
    const bufferAfter = eventType.buffer_after || 0;

    for (let d = 0; d < parseInt(days); d++) {
      const currentDate = addDays(startDate, d);
      const dayOfWeek = currentDate.getDay();

      // Find availability for this day
      const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

      if (!dayAvailability || !dayAvailability.is_available) {
        continue;
      }

      // Parse start and end times
      const [startHour, startMin] = dayAvailability.start_time.split(':').map(Number);
      const [endHour, endMin] = dayAvailability.end_time.split(':').map(Number);

      let slotStart = new Date(currentDate);
      slotStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // Generate slots for this day
      while (isBefore(addMinutes(slotStart, duration), dayEnd) || format(addMinutes(slotStart, duration), 'HH:mm') === format(dayEnd, 'HH:mm')) {
        const slotEnd = addMinutes(slotStart, duration);

        // Check if slot is in the past
        if (isBefore(slotStart, new Date())) {
          slotStart = addMinutes(slotStart, duration);
          continue;
        }

        // Check for conflicts with existing bookings
        const hasConflict = bookings.some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);

          // Add buffer times
          const bufferedStart = addMinutes(slotStart, -bufferBefore);
          const bufferedEnd = addMinutes(slotEnd, bufferAfter);

          return (
            (isBefore(bufferedStart, bookingEnd) && isAfter(bufferedEnd, bookingStart))
          );
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            formatted: format(slotStart, 'h:mm a'),
          });
        }

        slotStart = addMinutes(slotStart, duration);
      }
    }

    return res.status(200).json({
      eventType: {
        id: eventType.id,
        name: eventType.name,
        duration: eventType.duration,
        description: eventType.description,
        color: eventType.color,
      },
      slots,
    });
  } catch (error) {
    console.error('Available slots error:', error);
    return res.status(500).json({ error: 'Failed to get available slots' });
  }
}
