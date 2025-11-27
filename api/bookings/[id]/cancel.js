import { sql, initDb } from '../../_lib/db.js';
import { authenticateRequest } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    await initDb();

    const userId = authenticateRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify booking belongs to user's event type
    const result = await sql`
      UPDATE bookings b
      SET status = 'cancelled'
      FROM event_types et
      WHERE b.id = ${id} AND b.event_type_id = et.id AND et.user_id = ${userId}
      RETURNING b.*
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
}
