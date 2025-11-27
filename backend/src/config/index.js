require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  csrf: {
    secret: process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-production',
  },

  database: {
    path: process.env.DATABASE_PATH || './data.db',
  },

  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:5173', 'http://localhost:3000'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123',
  },
};

// Validate critical config in production
if (config.isProd) {
  const errors = [];

  if (config.jwt.secret === 'dev-secret-change-in-production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (config.csrf.secret === 'dev-csrf-secret-change-in-production') {
    errors.push('CSRF_SECRET must be set in production');
  }

  if (config.admin.password === 'changeme123') {
    errors.push('ADMIN_PASSWORD must be changed in production');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

module.exports = config;
