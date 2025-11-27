const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const config = require('./config');
const logger = require('./utils/logger');

// Create transporter - configure with your SMTP settings
const createTransporter = () => {
  if (!config.email.host && !process.env.SMTP_SERVICE) {
    return null;
  }

  const transportConfig = {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  };

  if (process.env.SMTP_SERVICE) {
    transportConfig.service = process.env.SMTP_SERVICE;
  }

  return nodemailer.createTransport(transportConfig);
};

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr);
  return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
};

const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:5173';
};

const sendBookingConfirmation = async (booking, settings, cancellationToken) => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.info('Email not configured. Skipping booking confirmation email.', {
      invitee: booking.invitee_name,
      email: booking.invitee_email,
      time: formatDateTime(booking.start_time)
    });
    return;
  }

  const startTime = formatDateTime(booking.start_time);
  const endTime = format(new Date(booking.end_time), 'h:mm a');
  const baseUrl = getBaseUrl();

  // Generate action URLs
  const cancelUrl = `${baseUrl}/booking/cancel/${booking.id}?token=${cancellationToken}`;
  const rescheduleUrl = `${baseUrl}/booking/reschedule/${booking.id}?token=${cancellationToken}`;
  const icalUrl = `${baseUrl}/api/bookings/${booking.id}/ical?token=${cancellationToken}`;

  // Email to invitee
  const inviteeEmail = {
    from: `"${settings.name}" <${config.email.from || settings.email}>`,
    to: booking.invitee_email,
    subject: `Confirmed: ${booking.event_type_name} with ${settings.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Your meeting is confirmed!</h2>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${booking.event_type_name}</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>When:</strong> ${startTime} - ${endTime}
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Duration:</strong> ${booking.duration} minutes
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Location:</strong> ${booking.location || 'To be determined'}
          </p>
          ${booking.notes ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Notes:</strong> ${booking.notes}
          </p>
          ` : ''}
        </div>

        <div style="margin: 20px 0;">
          <a href="${icalUrl}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">
            Add to Calendar
          </a>
        </div>

        <p style="color: #666; margin-top: 20px;">
          Need to make changes?
        </p>
        <p style="margin: 5px 0;">
          <a href="${rescheduleUrl}" style="color: #3b82f6; text-decoration: none;">Reschedule</a>
          &nbsp;|&nbsp;
          <a href="${cancelUrl}" style="color: #ef4444; text-decoration: none;">Cancel</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Booking ID: ${booking.id}
        </p>
      </div>
    `
  };

  // Email to host
  const hostEmail = {
    from: `"Calendly Clone" <${config.email.from || settings.email}>`,
    to: settings.email,
    subject: `New booking: ${booking.event_type_name} with ${booking.invitee_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Meeting Scheduled</h2>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${booking.event_type_name}</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>Invitee:</strong> ${booking.invitee_name} (${booking.invitee_email})
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>When:</strong> ${startTime} - ${endTime}
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Duration:</strong> ${booking.duration} minutes
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Location:</strong> ${booking.location || 'To be determined'}
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Timezone:</strong> ${booking.timezone}
          </p>
          ${booking.notes ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Notes:</strong> ${booking.notes}
          </p>
          ` : ''}
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Booking ID: ${booking.id}
        </p>
      </div>
    `
  };

  try {
    await Promise.all([
      transporter.sendMail(inviteeEmail),
      transporter.sendMail(hostEmail)
    ]);
    logger.info(`Confirmation emails sent for booking: ${booking.id}`);
  } catch (error) {
    logger.error('Failed to send confirmation emails:', error);
    throw error;
  }
};

const sendCancellationNotification = async (booking, settings) => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.info('Email not configured. Skipping cancellation email.', {
      invitee: booking.invitee_name,
      email: booking.invitee_email,
      time: formatDateTime(booking.start_time)
    });
    return;
  }

  const startTime = formatDateTime(booking.start_time);
  const baseUrl = getBaseUrl();

  // Email to invitee
  const inviteeEmail = {
    from: `"${settings.name}" <${config.email.from || settings.email}>`,
    to: booking.invitee_email,
    subject: `Cancelled: ${booking.event_type_name} with ${settings.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Meeting Cancelled</h2>

        <p style="color: #666;">
          The following meeting has been cancelled:
        </p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333; text-decoration: line-through;">${booking.event_type_name}</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>Was scheduled for:</strong> ${startTime}
          </p>
          ${booking.cancellation_reason ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Reason:</strong> ${booking.cancellation_reason}
          </p>
          ` : ''}
        </div>

        <p style="color: #666;">
          If you'd like to reschedule, please visit the booking page:
        </p>
        <p>
          <a href="${baseUrl}/book" style="color: #3b82f6; text-decoration: none;">Book a new meeting</a>
        </p>
      </div>
    `
  };

  // Email to host
  const hostEmail = {
    from: `"Calendly Clone" <${config.email.from || settings.email}>`,
    to: settings.email,
    subject: `Cancelled: ${booking.event_type_name} with ${booking.invitee_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Meeting Cancelled</h2>

        <p style="color: #666;">
          The following meeting has been cancelled:
        </p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333; text-decoration: line-through;">${booking.event_type_name}</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>Invitee:</strong> ${booking.invitee_name} (${booking.invitee_email})
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Was scheduled for:</strong> ${startTime}
          </p>
          ${booking.cancellation_reason ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Reason:</strong> ${booking.cancellation_reason}
          </p>
          ` : ''}
        </div>
      </div>
    `
  };

  try {
    await Promise.all([
      transporter.sendMail(inviteeEmail),
      transporter.sendMail(hostEmail)
    ]);
    logger.info(`Cancellation emails sent for booking: ${booking.id}`);
  } catch (error) {
    logger.error('Failed to send cancellation emails:', error);
    throw error;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotification
};
