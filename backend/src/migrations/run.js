const fs = require('fs');
const path = require('path');
const db = require('../database');

const migrationsDir = __dirname;

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js') && f !== 'run.js')
    .sort();
  return files;
}

/**
 * Get executed migrations from database
 */
function getExecutedMigrations() {
  try {
    const rows = db.prepare('SELECT name FROM migrations ORDER BY executed_at').all();
    return rows.map(r => r.name);
  } catch (error) {
    // Table might not exist yet
    return [];
  }
}

/**
 * Run pending migrations
 */
function runMigrations() {
  console.log('Running database migrations...\n');

  const migrationFiles = getMigrationFiles();
  const executedMigrations = getExecutedMigrations();

  const pendingMigrations = migrationFiles.filter(f => !executedMigrations.includes(f));

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations.\n');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);

  for (const file of pendingMigrations) {
    console.log(`  Running: ${file}`);

    try {
      const migration = require(path.join(migrationsDir, file));

      // Run the up function
      if (typeof migration.up === 'function') {
        migration.up(db);
      }

      // Record migration as executed
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);

      console.log(`  ✓ Completed: ${file}\n`);
    } catch (error) {
      console.error(`  ✗ Failed: ${file}`);
      console.error(`    Error: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully!\n');
}

/**
 * Rollback last migration
 */
function rollbackMigration() {
  const executedMigrations = getExecutedMigrations();

  if (executedMigrations.length === 0) {
    console.log('No migrations to rollback.\n');
    return;
  }

  const lastMigration = executedMigrations[executedMigrations.length - 1];
  console.log(`Rolling back: ${lastMigration}\n`);

  try {
    const migration = require(path.join(migrationsDir, lastMigration));

    if (typeof migration.down === 'function') {
      migration.down(db);
    }

    db.prepare('DELETE FROM migrations WHERE name = ?').run(lastMigration);

    console.log(`✓ Rolled back: ${lastMigration}\n`);
  } catch (error) {
    console.error(`✗ Rollback failed: ${lastMigration}`);
    console.error(`  Error: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
function showStatus() {
  const migrationFiles = getMigrationFiles();
  const executedMigrations = getExecutedMigrations();

  console.log('Migration Status:\n');
  console.log('  Status    | Migration');
  console.log('  ----------|-------------------');

  for (const file of migrationFiles) {
    const status = executedMigrations.includes(file) ? '✓ Done' : '○ Pending';
    console.log(`  ${status.padEnd(9)} | ${file}`);
  }

  console.log('');
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'up':
  case undefined:
    runMigrations();
    break;
  case 'down':
    rollbackMigration();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('Usage: node run.js [up|down|status]');
    console.log('  up     - Run pending migrations (default)');
    console.log('  down   - Rollback last migration');
    console.log('  status - Show migration status');
}

process.exit(0);
