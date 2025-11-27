import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255) DEFAULT 'Your Name',
      email VARCHAR(255) DEFAULT '',
      timezone VARCHAR(100) DEFAULT 'America/New_York',
      booking_url VARCHAR(255) DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_types (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      description TEXT,
      color VARCHAR(50) DEFAULT '#3B82F6',
      is_active BOOLEAN DEFAULT true,
      buffer_before INTEGER DEFAULT 0,
      buffer_after INTEGER DEFAULT 0,
      max_bookings_per_day INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slug)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      day_of_week INTEGER NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      is_available BOOLEAN DEFAULT true,
      UNIQUE(user_id, day_of_week)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS availability_overrides (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      date DATE NOT NULL,
      start_time VARCHAR(10),
      end_time VARCHAR(10),
      is_available BOOLEAN DEFAULT false,
      reason VARCHAR(255),
      UNIQUE(user_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      event_type_id INTEGER REFERENCES event_types(id),
      guest_name VARCHAR(255) NOT NULL,
      guest_email VARCHAR(255) NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      timezone VARCHAR(100) DEFAULT 'America/New_York',
      notes TEXT,
      status VARCHAR(50) DEFAULT 'confirmed',
      cancel_token VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

// Helper to run queries
export { sql };
