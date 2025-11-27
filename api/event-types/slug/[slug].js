import { sql, initDb } from '../../_lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  try {
    await initDb();

    const result = await sql`
      SELECT * FROM event_types WHERE slug = ${slug} AND is_active = true
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get event type by slug error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
