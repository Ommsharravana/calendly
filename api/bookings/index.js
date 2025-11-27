import { sql, initDb } from '../_lib/db.js';
import { authenticateRequest } from '../_lib/auth.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    await initDb();

    if (req.method === 'GET') {
      const userId = authenticateRequest(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status, upcoming } = req.query;

      let result;
      if (upcoming === 'true') {
        result = await sql`
          SELECT b.*, et.name as event_type_name, et.duration, et.color
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE et.user_id = ${userId} AND b.status = 'confirmed' AND b.start_time > NOW()
          ORDER BY b.start_time
          LIMIT 10
        `;
      } else if (status) {
        result = await sql`
          SELECT b.*, et.name as event_type_name, et.duration, et.color
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE et.user_id = ${userId} AND b.status = ${status}
          ORDER BY b.start_time DESC
        `;
      } else {
        result = await sql`
          SELECT b.*, et.name as event_type_name, et.duration, et.color
          FROM bookings b
          JOIN event_types et ON b.event_type_id = et.id
          WHERE et.user_id = ${userId}
          ORDER BY b.start_time DESC
        `;
      }

      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      // Public endpoint for creating bookings
      const { event_type_id, guest_name, guest_email, start_time, end_time, timezone, notes } = req.body;

      if (!event_type_id || !guest_name || !guest_email || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify event type exists and is active
      const eventTypeResult = await sql`
        SELECT * FROM event_types WHERE id = ${event_type_id} AND is_active = true
      `;
      if (eventTypeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event type not found' });
      }

      // Check for conflicts
      const conflictResult = await sql`
        SELECT id FROM bookings
        WHERE event_type_id = ${event_type_id}
        AND status = 'confirmed'
        AND (
          (start_time <= ${start_time} AND end_time > ${start_time})
          OR (start_time < ${end_time} AND end_time >= ${end_time})
          OR (start_time >= ${start_time} AND end_time <= ${end_time})
        )
      `;

      if (conflictResult.rows.length > 0) {
        return res.status(409).json({ error: 'Time slot is no longer available' });
      }

      const cancelToken = uuidv4();

      const result = await sql`
        INSERT INTO bookings (event_type_id, guest_name, guest_email, start_time, end_time, timezone, notes, cancel_token)
        VALUES (${event_type_id}, ${guest_name}, ${guest_email}, ${start_time}, ${end_time}, ${timezone || 'America/New_York'}, ${notes || ''}, ${cancelToken})
        RETURNING *
      `;

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bookings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
