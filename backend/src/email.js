const nodemailer = require('nodemailer');
const { format } = require('date-fns');

// Create transporter - configure with your SMTP settings
// For development/personal use, you can use services like:
// - Gmail (with app password)
// - SendGrid
// - Mailgun
// - Or any SMTP server

const createTransporter = () => {
  // Check if email is configured
  if (!process.env.SMTP_HOST && !process.env.SMTP_SERVICE) {
    return null;
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Use service if specified (e.g., 'gmail', 'sendgrid')
  if (process.env.SMTP_SERVICE) {
    config.service = process.env.SMTP_SERVICE;
  }

  return nodemailer.createTransport(config);
};

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr);
  return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
};

const sendBookingConfirmation = async (booking, settings) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('Email not configured. Skipping booking confirmation email.');
    console.log('Booking details:', {
      invitee: booking.invitee_name,
      email: booking.invitee_email,
      time: formatDateTime(booking.start_time)
    });
    return;
  }

  const startTime = formatDateTime(booking.start_time);
  const endTime = format(new Date(booking.end_time), 'h:mm a');

  // Email to invitee
  const inviteeEmail = {
    from: `"${settings.name}" <${process.env.SMTP_FROM || settings.email}>`,
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

        <p style="color: #666;">
          If you need to make changes, please contact ${settings.name} at ${settings.email}.
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
    from: `"Calendly Clone" <${process.env.SMTP_FROM || settings.email}>`,
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

  await Promise.all([
    transporter.sendMail(inviteeEmail),
    transporter.sendMail(hostEmail)
  ]);
};

const sendCancellationNotification = async (booking, settings) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('Email not configured. Skipping cancellation email.');
    console.log('Cancelled booking:', {
      invitee: booking.invitee_name,
      email: booking.invitee_email,
      time: formatDateTime(booking.start_time)
    });
    return;
  }

  const startTime = formatDateTime(booking.start_time);

  const email = {
    from: `"${settings.name}" <${process.env.SMTP_FROM || settings.email}>`,
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
          If you'd like to reschedule, please visit the booking page again.
        </p>
      </div>
    `
  };

  await transporter.sendMail(email);
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotification
};
