import { sql, initDb } from '../_lib/db.js';
import { hashPassword, generateToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDb();

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if any users exist
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
    if (parseInt(existingUsers.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Setup already completed' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (email, password, name)
      VALUES (${email}, ${hashedPassword}, ${name || 'Admin'})
      RETURNING id, email, name
    `;
    const user = result.rows[0];

    // Create default settings
    await sql`
      INSERT INTO settings (user_id, name, email, timezone)
      VALUES (${user.id}, ${name || 'Admin'}, ${email}, 'America/New_York')
    `;

    // Create default availability (Mon-Fri 9-5)
    for (let day = 1; day <= 5; day++) {
      await sql`
        INSERT INTO availability (user_id, day_of_week, start_time, end_time, is_available)
        VALUES (${user.id}, ${day}, '09:00', '17:00', true)
      `;
    }
    // Weekend unavailable
    for (const day of [0, 6]) {
      await sql`
        INSERT INTO availability (user_id, day_of_week, start_time, end_time, is_available)
        VALUES (${user.id}, ${day}, '09:00', '17:00', false)
      `;
    }

    // Create default event types
    const eventTypes = [
      { name: '15 Minute Meeting', slug: '15min', duration: 15, color: '#10B981' },
      { name: '30 Minute Meeting', slug: '30min', duration: 30, color: '#3B82F6' },
      { name: '60 Minute Meeting', slug: '60min', duration: 60, color: '#8B5CF6' },
    ];

    for (const et of eventTypes) {
      await sql`
        INSERT INTO event_types (user_id, name, slug, duration, color, is_active)
        VALUES (${user.id}, ${et.name}, ${et.slug}, ${et.duration}, ${et.color}, true)
      `;
    }

    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Failed to complete setup' });
  }
}
