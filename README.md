# Calendly Clone

A self-hosted scheduling application for personal use. No subscription needed.

## Features

- **Event Types**: Create multiple meeting types (15min, 30min, 60min, etc.) with custom colors and settings
- **Availability Management**: Set your weekly availability hours
- **Public Booking Page**: Share your link and let people book meetings with you
- **Booking Management**: View, manage, and cancel bookings
- **Email Notifications**: Get notified when meetings are booked or cancelled (optional SMTP configuration)
- **Buffer Times**: Set buffer time before/after meetings
- **Max Daily Bookings**: Limit bookings per day per event type

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Development

```bash
# Run both frontend and backend in development mode
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Public booking page: http://localhost:5173/book

### Production

```bash
# Build the frontend
npm run build

# Start the server
npm start
```

## Project Structure

```
calendly/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── database.js       # SQLite database setup
│   │   ├── email.js          # Email notifications
│   │   └── routes/
│   │       ├── settings.js   # User settings API
│   │       ├── eventTypes.js # Event types CRUD
│   │       ├── availability.js # Availability management
│   │       ├── bookings.js   # Bookings CRUD
│   │       └── schedule.js   # Available slots calculation
│   └── data.db               # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main app with routing
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   └── utils/api.js      # API client
│   └── index.html
│
└── package.json              # Root package.json with scripts
```

## Configuration

### Email Notifications (Optional)

To enable email notifications, set these environment variables:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com  # optional
```

For Gmail, you'll need to create an [App Password](https://support.google.com/accounts/answer/185833).

### Database

The app uses SQLite for storage. The database file (`data.db`) is automatically created in the backend folder on first run with default data:

- Default availability: Monday-Friday, 9am-5pm
- Three default event types: 15min, 30min, and 60min meetings

## API Endpoints

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Event Types
- `GET /api/event-types` - List all event types
- `GET /api/event-types/active` - List active event types (for public page)
- `GET /api/event-types/:id` - Get single event type
- `GET /api/event-types/slug/:slug` - Get by URL slug
- `POST /api/event-types` - Create event type
- `PUT /api/event-types/:id` - Update event type
- `DELETE /api/event-types/:id` - Delete event type

### Availability
- `GET /api/availability` - Get weekly availability
- `PUT /api/availability` - Update weekly availability
- `GET /api/availability/overrides` - Get date overrides
- `POST /api/availability/overrides` - Create date override
- `DELETE /api/availability/overrides/:id` - Delete override

### Bookings
- `GET /api/bookings` - List bookings (with filters)
- `GET /api/bookings/upcoming` - Get upcoming bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `PUT /api/bookings/:id/reschedule` - Reschedule booking
- `DELETE /api/bookings/:id` - Delete booking

### Schedule
- `GET /api/schedule/available-slots/:slug` - Get available time slots
- `GET /api/schedule/calendar` - Get calendar data

## Usage

1. **First Setup**: Go to Settings to configure your name, email, and timezone
2. **Event Types**: Create or customize your meeting types in Event Types
3. **Availability**: Set your available hours in Availability
4. **Share Link**: Copy your booking link from Settings and share it
5. **Manage Bookings**: View and manage all bookings in Bookings

## License

MIT - Use it however you want for personal use.
