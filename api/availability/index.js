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
      // Can be public or authenticated
      let result;
      if (userId) {
        result = await sql`
          SELECT * FROM availability WHERE user_id = ${userId} ORDER BY day_of_week
        `;
      } else {
        // Get first user's availability for public booking
        result = await sql`
          SELECT a.* FROM availability a
          JOIN users u ON a.user_id = u.id
          ORDER BY a.day_of_week
          LIMIT 7
        `;
      }

      return res.status(200).json(result.rows);
    }

    if (req.method === 'PUT') {
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { availability } = req.body;

      if (!Array.isArray(availability)) {
        return res.status(400).json({ error: 'Availability must be an array' });
      }

      // Update each day
      for (const day of availability) {
        await sql`
          UPDATE availability
          SET start_time = ${day.start_time}, end_time = ${day.end_time}, is_available = ${day.is_available}
          WHERE user_id = ${userId} AND day_of_week = ${day.day_of_week}
        `;
      }

      const result = await sql`
        SELECT * FROM availability WHERE user_id = ${userId} ORDER BY day_of_week
      `;

      return res.status(200).json(result.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Availability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
