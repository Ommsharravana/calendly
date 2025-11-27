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
const bookingsRoutes = require('../src/routes/bookings');

app.use('/api/auth', authRoutes);
app.use('/api/event-types', eventTypesRoutes);
app.use('/api/bookings', bookingsRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    code: err.code || 'ERROR'
  });
});

describe('Bookings API', () => {
  let authToken;
  let eventTypeId;
  let bookingId;
  let cancellationToken;

  beforeAll(async () => {
    // Setup auth
    try {
      await request(app)
        .post('/api/auth/setup')
        .send({
          email: 'booking-test@test.com',
          password: 'password123',
          name: 'Booking Test'
        });
    } catch (e) {}

    const authRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'booking-test@test.com',
        password: 'password123'
      });
    authToken = authRes.body.token;

    // Get an event type
    const eventRes = await request(app)
      .get('/api/event-types/active');
    eventTypeId = eventRes.body[0].id;
  });

  describe('POST /api/bookings', () => {
    it('should create a booking', async () => {
      // Create a booking for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30);

      const res = await request(app)
        .post('/api/bookings')
        .send({
          event_type_id: eventTypeId,
          invitee_name: 'John Doe',
          invitee_email: 'john@example.com',
          start_time: tomorrow.toISOString(),
          end_time: endTime.toISOString(),
          timezone: 'America/New_York',
          notes: 'Test booking'
        })
        .expect(201);

      expect(res.body.invitee_name).toBe('John Doe');
      expect(res.body.status).toBe('confirmed');
      expect(res.body).toHaveProperty('cancellation_token');

      bookingId = res.body.id;
      cancellationToken = res.body.cancellation_token;
    });

    it('should reject past time slots', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const res = await request(app)
        .post('/api/bookings')
        .send({
          event_type_id: eventTypeId,
          invitee_name: 'Jane Doe',
          invitee_email: 'jane@example.com',
          start_time: yesterday.toISOString(),
          end_time: yesterday.toISOString(),
          timezone: 'America/New_York'
        })
        .expect(400);

      expect(res.body.code).toBe('INVALID_TIME');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          event_type_id: eventTypeId,
          invitee_name: 'Missing Fields'
        })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return limited info without token', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .expect(200);

      // Should NOT include sensitive data
      expect(res.body).not.toHaveProperty('invitee_email');
      expect(res.body).not.toHaveProperty('notes');
    });

    it('should return full info with token', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}?token=${cancellationToken}`)
        .expect(200);

      expect(res.body.invitee_email).toBe('john@example.com');
    });
  });

  describe('GET /api/bookings', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/bookings')
        .expect(401);
    });

    it('should return bookings when authenticated', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/bookings/:id/cancel-public', () => {
    it('should cancel booking with valid token', async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel-public`)
        .send({
          token: cancellationToken,
          cancellation_reason: 'Test cancellation'
        })
        .expect(200);

      expect(res.body.status).toBe('cancelled');
    });

    it('should reject invalid token', async () => {
      await request(app)
        .post(`/api/bookings/${bookingId}/cancel-public`)
        .send({
          token: 'invalid-token'
        })
        .expect(403);
    });
  });

  describe('GET /api/bookings/upcoming', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/bookings/upcoming')
        .expect(401);
    });

    it('should return upcoming bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
