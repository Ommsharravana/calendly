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
      let result;
      if (userId) {
        result = await sql`SELECT * FROM settings WHERE user_id = ${userId}`;
      } else {
        // Public - get first user's settings
        result = await sql`
          SELECT s.* FROM settings s
          JOIN users u ON s.user_id = u.id
          LIMIT 1
        `;
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, email, timezone, booking_url } = req.body;

      const result = await sql`
        UPDATE settings
        SET name = ${name}, email = ${email}, timezone = ${timezone}, booking_url = ${booking_url}, updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
