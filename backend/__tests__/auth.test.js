const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Setup test app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Import routes after env is set
const authRoutes = require('../src/routes/auth');
app.use('/api/auth', authRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    code: err.code || 'ERROR'
  });
});

describe('Auth API', () => {
  describe('GET /api/auth/status', () => {
    it('should indicate setup is required when no users exist', async () => {
      const res = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(res.body).toHaveProperty('setupRequired');
    });
  });

  describe('POST /api/auth/setup', () => {
    it('should create admin user on first setup', async () => {
      const res = await request(app)
        .post('/api/auth/setup')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          name: 'Test Admin'
        })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('admin@test.com');
    });

    it('should reject setup if user already exists', async () => {
      const res = await request(app)
        .post('/api/auth/setup')
        .send({
          email: 'another@test.com',
          password: 'password123',
          name: 'Another Admin'
        })
        .expect(400);

      expect(res.body.code).toBe('SETUP_COMPLETED');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });
      authToken = res.body.token;
    });

    it('should return user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.email).toBe('admin@test.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});
