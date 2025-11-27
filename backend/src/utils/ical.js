const icalGenerator = require('ical-generator');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate an iCal file for a booking
 */
const generateICalEvent = (booking, settings) => {
  const calendar = icalGenerator({
    name: `${settings.name} - Meetings`,
    timezone: booking.timezone,
  });

  const event = calendar.createEvent({
    id: booking.id,
    start: new Date(booking.start_time),
    end: new Date(booking.end_time),
    summary: `${booking.event_type_name} with ${booking.invitee_name}`,
    description: booking.notes || '',
    location: booking.location || 'Online',
    organizer: {
      name: settings.name,
      email: settings.email,
    },
    attendees: [
      {
        name: booking.invitee_name,
        email: booking.invitee_email,
        rsvp: true,
        status: 'ACCEPTED',
      },
    ],
    status: booking.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    created: new Date(booking.created_at),
    lastModified: new Date(booking.updated_at || booking.created_at),
  });

  return calendar.toString();
};

/**
 * Generate a cancellation token
 */
const generateCancellationToken = () => {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
};

/**
 * Generate cancellation URL
 */
const generateCancellationUrl = (baseUrl, bookingId, token) => {
  return `${baseUrl}/booking/cancel/${bookingId}?token=${token}`;
};

/**
 * Generate reschedule URL
 */
const generateRescheduleUrl = (baseUrl, bookingId, token) => {
  return `${baseUrl}/booking/reschedule/${bookingId}?token=${token}`;
};

module.exports = {
  generateICalEvent,
  generateCancellationToken,
  generateCancellationUrl,
  generateRescheduleUrl,
};
