const path = require('path');
const fs = require('fs');

// Use a test database
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(__dirname, 'test.db');
process.env.JWT_SECRET = 'test-secret-key';
process.env.CSRF_SECRET = 'test-csrf-secret';

// Clean up test database before and after tests
beforeAll(() => {
  const testDbPath = process.env.DATABASE_PATH;
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  // Also clean WAL files
  if (fs.existsSync(testDbPath + '-wal')) {
    fs.unlinkSync(testDbPath + '-wal');
  }
  if (fs.existsSync(testDbPath + '-shm')) {
    fs.unlinkSync(testDbPath + '-shm');
  }
});

afterAll(() => {
  const testDbPath = process.env.DATABASE_PATH;
  // Give SQLite time to close
  setTimeout(() => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testDbPath + '-wal')) {
        fs.unlinkSync(testDbPath + '-wal');
      }
      if (fs.existsSync(testDbPath + '-shm')) {
        fs.unlinkSync(testDbPath + '-shm');
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }, 100);
});
