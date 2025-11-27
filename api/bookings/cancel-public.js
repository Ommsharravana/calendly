import { sql, initDb } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Cancellation token is required' });
    }

    const result = await sql`
      UPDATE bookings
      SET status = 'cancelled'
      WHERE cancel_token = ${token} AND status = 'confirmed'
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or already cancelled' });
    }

    return res.status(200).json({ message: 'Booking cancelled successfully', booking: result.rows[0] });
  } catch (error) {
    console.error('Public cancel error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
}
