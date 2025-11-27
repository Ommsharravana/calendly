/**
 * Migration: Add reminder fields to bookings
 * This is an example migration showing the pattern
 */

module.exports = {
  up: (db) => {
    // Add reminder_sent column to bookings
    db.exec(`
      ALTER TABLE bookings ADD COLUMN reminder_sent INTEGER DEFAULT 0;
    `);
  },

  down: (db) => {
    // SQLite doesn't support DROP COLUMN directly
    // In production, you'd recreate the table without the column
    // For now, we just mark it as deprecated
    console.log('Note: SQLite does not support DROP COLUMN. Column remains but is unused.');
  }
};
