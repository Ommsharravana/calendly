import { sql, initDb } from '../_lib/db.js';
import { authenticateRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  const { id } = req.query;

  try {
    await initDb();

    const userId = authenticateRequest(req);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM event_types WHERE id = ${id}`;
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event type not found' });
      }
      return res.status(200).json(result.rows[0]);
    }

    // Require auth for PUT and DELETE
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PUT') {
      const { name, slug, duration, description, color, is_active, buffer_before, buffer_after, max_bookings_per_day } = req.body;

      const result = await sql`
        UPDATE event_types
        SET name = ${name}, slug = ${slug}, duration = ${duration}, description = ${description || ''},
            color = ${color || '#3B82F6'}, is_active = ${is_active !== false},
            buffer_before = ${buffer_before || 0}, buffer_after = ${buffer_after || 0},
            max_bookings_per_day = ${max_bookings_per_day || null}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event type not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const result = await sql`
        DELETE FROM event_types WHERE id = ${id} AND user_id = ${userId} RETURNING id
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event type not found' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Event type error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
