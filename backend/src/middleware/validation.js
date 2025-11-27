const { z } = require('zod');
const xss = require('xss');

/**
 * XSS sanitization options
 */
const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

/**
 * Sanitize a string value
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim(), xssOptions);
};

/**
 * Recursively sanitize object values
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Sanitize input first
      req.body = sanitizeObject(req.body);
      req.query = sanitizeObject(req.query);
      req.params = sanitizeObject(req.params);

      // Validate with Zod
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
      }

      // Replace with validated and transformed data
      if (result.data.body) req.body = result.data.body;
      if (result.data.query) req.query = result.data.query;
      if (result.data.params) req.params = result.data.params;

      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
      });
    }
  };
};

// ============================================
// Common Validation Schemas
// ============================================

const schemas = {
  // Auth schemas
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  // Settings schemas
  updateSettings: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      timezone: z.string().max(50).optional(),
      welcome_message: z.string().max(500).optional().nullable(),
    }),
  }),

  // Event type schemas
  createEventType: z.object({
    body: z.object({
      name: z.string().min(1, 'Name is required').max(100),
      slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
      description: z.string().max(500).optional().nullable(),
      duration: z.number().int().min(5).max(480).default(30),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0066FF'),
      location: z.string().max(200).default('Google Meet'),
      buffer_before: z.number().int().min(0).max(60).default(0),
      buffer_after: z.number().int().min(0).max(60).default(0),
      max_bookings_per_day: z.number().int().min(1).max(50).optional().nullable(),
    }),
  }),

  updateEventType: z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
      description: z.string().max(500).optional().nullable(),
      duration: z.number().int().min(5).max(480).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      location: z.string().max(200).optional(),
      is_active: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
      buffer_before: z.number().int().min(0).max(60).optional(),
      buffer_after: z.number().int().min(0).max(60).optional(),
      max_bookings_per_day: z.number().int().min(1).max(50).optional().nullable(),
    }),
  }),

  // Availability schemas
  updateAvailability: z.object({
    body: z.object({
      schedule: z.array(z.object({
        day_of_week: z.number().int().min(0).max(6),
        start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
        end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
        is_available: z.boolean(),
      })),
    }),
  }),

  createOverride: z.object({
    body: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
      start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
      end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
      is_available: z.boolean(),
      reason: z.string().max(200).optional().nullable(),
    }),
  }),

  // Booking schemas
  createBooking: z.object({
    body: z.object({
      event_type_id: z.string().uuid('Invalid event type ID'),
      invitee_name: z.string().min(1, 'Name is required').max(100),
      invitee_email: z.string().email('Invalid email format'),
      start_time: z.string().datetime({ message: 'Invalid start time format' }),
      end_time: z.string().datetime({ message: 'Invalid end time format' }),
      timezone: z.string().min(1).max(50),
      notes: z.string().max(1000).optional().nullable(),
      location: z.string().max(200).optional().nullable(),
    }),
  }),

  cancelBooking: z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      cancellation_reason: z.string().max(500).optional().nullable(),
    }),
  }),

  rescheduleBooking: z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      start_time: z.string().datetime(),
      end_time: z.string().datetime(),
      timezone: z.string().min(1).max(50).optional(),
    }),
  }),

  // Query params schemas
  bookingsQuery: z.object({
    query: z.object({
      status: z.enum(['confirmed', 'cancelled', 'completed']).optional(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      event_type_id: z.string().uuid().optional(),
    }),
  }),

  availableSlotsQuery: z.object({
    params: z.object({
      eventTypeSlug: z.string().min(1).max(50),
    }),
    query: z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date is required (YYYY-MM-DD)'),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      timezone: z.string().max(50).optional(),
    }),
  }),

  // ID param schema
  idParam: z.object({
    params: z.object({
      id: z.string().uuid('Invalid ID format'),
    }),
  }),

  slugParam: z.object({
    params: z.object({
      slug: z.string().min(1).max(50),
    }),
  }),
};

module.exports = {
  validate,
  sanitizeString,
  sanitizeObject,
  schemas,
  z,
};
