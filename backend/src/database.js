const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- User settings (single user, personal use)
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'Your Name',
    email TEXT NOT NULL DEFAULT 'you@example.com',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    welcome_message TEXT DEFAULT 'Welcome to my scheduling page!',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Event types (15min call, 30min meeting, etc.)
  CREATE TABLE IF NOT EXISTS event_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 30,
    color TEXT NOT NULL DEFAULT '#0066FF',
    location TEXT DEFAULT 'Google Meet',
    is_active INTEGER NOT NULL DEFAULT 1,
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    max_bookings_per_day INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Weekly availability schedule
  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type_id TEXT,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
  );

  -- Default availability (applies when event_type_id is NULL)
  -- day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  -- Date-specific overrides (holidays, special hours)
  CREATE TABLE IF NOT EXISTS availability_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    is_available INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Bookings
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    event_type_id TEXT NOT NULL,
    invitee_name TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    timezone TEXT NOT NULL,
    notes TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    cancellation_reason TEXT,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
  );

  -- Create indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_event_type ON bookings(event_type_id);
  CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day_of_week);
  CREATE INDEX IF NOT EXISTS idx_availability_event_type ON availability(event_type_id);
`);

// Insert default settings if not exists
const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsExist.count === 0) {
  db.prepare('INSERT INTO settings (id, name, email) VALUES (1, ?, ?)').run('Your Name', 'you@example.com');
}

// Insert default availability if not exists (Mon-Fri, 9am-5pm)
const availabilityExist = db.prepare('SELECT COUNT(*) as count FROM availability WHERE event_type_id IS NULL').get();
if (availabilityExist.count === 0) {
  const insertAvailability = db.prepare(`
    INSERT INTO availability (event_type_id, day_of_week, start_time, end_time, is_available)
    VALUES (NULL, ?, ?, ?, ?)
  `);

  // Monday to Friday, 9am to 5pm
  for (let day = 1; day <= 5; day++) {
    insertAvailability.run(day, '09:00', '17:00', 1);
  }
  // Weekend - not available
  insertAvailability.run(0, '09:00', '17:00', 0); // Sunday
  insertAvailability.run(6, '09:00', '17:00', 0); // Saturday
}

// Insert default event types if none exist
const eventTypesExist = db.prepare('SELECT COUNT(*) as count FROM event_types').get();
if (eventTypesExist.count === 0) {
  const { v4: uuidv4 } = require('uuid');

  const insertEventType = db.prepare(`
    INSERT INTO event_types (id, name, slug, description, duration, color, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertEventType.run(
    uuidv4(),
    '15 Minute Meeting',
    '15min',
    'A quick 15-minute chat.',
    15,
    '#10B981',
    'Google Meet'
  );

  insertEventType.run(
    uuidv4(),
    '30 Minute Meeting',
    '30min',
    'A standard 30-minute meeting.',
    30,
    '#3B82F6',
    'Google Meet'
  );

  insertEventType.run(
    uuidv4(),
    '60 Minute Meeting',
    '60min',
    'An in-depth 60-minute discussion.',
    60,
    '#8B5CF6',
    'Google Meet'
  );
}

module.exports = db;
