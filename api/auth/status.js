import { sql, initDb } from '../_lib/db.js';
import { authenticateRequest, jsonResponse, corsHeaders } from '../_lib/auth.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    await initDb();

    // Check if any users exist
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    const userCount = parseInt(result.rows[0].count);
    const setupRequired = userCount === 0;

    // Check if authenticated
    const userId = authenticateRequest(req);

    return res.status(200).json({
      setupRequired,
      authenticated: !!userId,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
