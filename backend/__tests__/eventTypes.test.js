const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Setup test app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Import routes
const authRoutes = require('../src/routes/auth');
const eventTypesRoutes = require('../src/routes/eventTypes');

app.use('/api/auth', authRoutes);
app.use('/api/event-types', eventTypesRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    code: err.code || 'ERROR'
  });
});

describe('Event Types API', () => {
  let authToken;

  beforeAll(async () => {
    // Create user if not exists and login
    try {
      await request(app)
        .post('/api/auth/setup')
        .send({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test User'
        });
    } catch (e) {
      // User might already exist
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });
    authToken = res.body.token;
  });

  describe('GET /api/event-types/active', () => {
    it('should return active event types (public)', async () => {
      const res = await request(app)
        .get('/api/event-types/active')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Default event types are created on DB init
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/event-types', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/event-types')
        .expect(401);
    });

    it('should return all event types when authenticated', async () => {
      const res = await request(app)
        .get('/api/event-types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/event-types', () => {
    it('should create new event type', async () => {
      const res = await request(app)
        .post('/api/event-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Meeting',
          slug: 'test-meeting',
          description: 'A test meeting type',
          duration: 45,
          color: '#FF5733',
          location: 'Zoom'
        })
        .expect(201);

      expect(res.body.name).toBe('Test Meeting');
      expect(res.body.slug).toBe('test-meeting');
      expect(res.body.duration).toBe(45);
    });

    it('should reject duplicate slug', async () => {
      const res = await request(app)
        .post('/api/event-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Test',
          slug: 'test-meeting',
          duration: 30
        })
        .expect(400);

      expect(res.body.code).toBe('SLUG_EXISTS');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/event-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Missing Slug'
        })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/event-types/slug/:slug', () => {
    it('should return event type by slug (public)', async () => {
      const res = await request(app)
        .get('/api/event-types/slug/test-meeting')
        .expect(200);

      expect(res.body.slug).toBe('test-meeting');
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app)
        .get('/api/event-types/slug/non-existent')
        .expect(404);
    });
  });

  describe('PUT /api/event-types/:id', () => {
    let eventTypeId;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/event-types/slug/test-meeting');
      eventTypeId = res.body.id;
    });

    it('should update event type', async () => {
      const res = await request(app)
        .put(`/api/event-types/${eventTypeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Meeting',
          duration: 60
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Meeting');
      expect(res.body.duration).toBe(60);
    });
  });

  describe('DELETE /api/event-types/:id', () => {
    let eventTypeId;

    beforeAll(async () => {
      // Create a new event type to delete
      const res = await request(app)
        .post('/api/event-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Delete',
          slug: 'to-delete',
          duration: 30
        });
      eventTypeId = res.body.id;
    });

    it('should delete event type', async () => {
      await request(app)
        .delete(`/api/event-types/${eventTypeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app)
        .get(`/api/event-types/slug/to-delete`)
        .expect(404);
    });
  });
});
