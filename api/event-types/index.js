import { sql, initDb } from '../_lib/db.js';
import { authenticateRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    await initDb();

    const userId = authenticateRequest(req);

    if (req.method === 'GET') {
      // Check if requesting active only (public endpoint)
      const activeOnly = req.query.active === 'true';

      let result;
      if (activeOnly) {
        // Public - get first user's active event types
        result = await sql`
          SELECT et.* FROM event_types et
          JOIN users u ON et.user_id = u.id
          WHERE et.is_active = true
          ORDER BY et.duration
        `;
      } else {
        // Admin - requires auth
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        result = await sql`
          SELECT * FROM event_types WHERE user_id = ${userId} ORDER BY duration
        `;
      }

      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, slug, duration, description, color, buffer_before, buffer_after, max_bookings_per_day } = req.body;

      if (!name || !slug || !duration) {
        return res.status(400).json({ error: 'Name, slug, and duration are required' });
      }

      const result = await sql`
        INSERT INTO event_types (user_id, name, slug, duration, description, color, buffer_before, buffer_after, max_bookings_per_day)
        VALUES (${userId}, ${name}, ${slug}, ${duration}, ${description || ''}, ${color || '#3B82F6'}, ${buffer_before || 0}, ${buffer_after || 0}, ${max_bookings_per_day || null})
        RETURNING *
      `;

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Event types error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'An event type with this URL already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
