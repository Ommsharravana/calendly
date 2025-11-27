# Calendly Clone

Your own personal scheduling app - no subscription needed!

## What is this?

This is a **free, self-hosted alternative to Calendly**. You can:

- Let people book meetings with you
- Set your available hours
- Create different meeting types (15min calls, 1-hour meetings, etc.)
- Get email notifications when someone books
- No monthly fees!

---

## Quick Start (One Command!)

### Step 1: Install Node.js (if you don't have it)

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** version (the big green button)
3. Install it (just click Next until done)

### Step 2: Start the App

Open your terminal/command prompt and run:

```bash
./setup.sh
```

**That's it!** The app will:
- Install everything automatically
- Create your configuration
- Start the servers

### Step 3: Create Your Account

1. Open your browser to **http://localhost:5173**
2. Create your admin account (email + password)
3. Set up your availability
4. Share your booking link!

---

## How to Use

### Setting Up Your Calendar

1. **Go to Settings** - Add your name, email, and timezone
2. **Set Availability** - Choose which hours you're free for meetings
3. **Create Event Types** - Set up different meeting types:
   - "Quick Call" - 15 minutes
   - "Regular Meeting" - 30 minutes
   - "Deep Dive" - 60 minutes

### Sharing Your Booking Link

Your public booking page is at:
```
http://localhost:5173/book
```

Share this link with anyone who wants to book time with you!

### Managing Bookings

- View all your upcoming and past meetings in the **Bookings** page
- Cancel or reschedule meetings if needed
- Download calendar invites (.ics files)

---

## Stopping the App

Press `Ctrl+C` in the terminal, or run:

```bash
./stop.sh
```

---

## Starting Again Later

Anytime you want to use the app again, just run:

```bash
./setup.sh
```

---

## Email Notifications (Optional)

Want to get emails when someone books? Edit the file `backend/.env` and add your email settings:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Your Name <your-email@gmail.com>
```

**For Gmail users:** You need to create an "App Password":
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication (if not already)
3. Go to "App passwords"
4. Create a new app password for "Mail"
5. Use that password in SMTP_PASS

---

## Troubleshooting

### "Command not found" when running setup.sh

Make sure you're in the right folder:
```bash
cd calendly
./setup.sh
```

On Windows, you may need to use:
```bash
bash setup.sh
```

### "Port already in use"

Something else is running on port 3001 or 5173. The setup script usually handles this, but you can manually stop them:
```bash
./stop.sh
```

### "Node is not recognized"

Node.js isn't installed properly. Try reinstalling from [nodejs.org](https://nodejs.org/).

### App won't start

1. Delete `backend/data.db` (your database will be reset)
2. Run `./setup.sh` again

### Need more help?

Check the logs in your terminal for error messages.

---

## For Developers

### Running in Development Mode

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Project Structure

```
calendly/
├── setup.sh              # One-command setup script
├── stop.sh               # Stop the app
├── backend/
│   ├── src/
│   │   ├── index.js      # Express server
│   │   ├── database.js   # SQLite database
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, validation, security
│   │   └── migrations/   # Database migrations
│   └── __tests__/        # Backend tests
├── frontend/
│   ├── src/
│   │   ├── pages/        # React pages
│   │   ├── components/   # Reusable components
│   │   └── context/      # Auth state
│   └── __tests__/        # Frontend tests
└── README.md
```

### API Endpoints

**Auth:**
- `POST /api/auth/setup` - Create admin account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Event Types:**
- `GET /api/event-types/active` - Public: list active types
- `GET /api/event-types` - Admin: list all types
- `POST /api/event-types` - Create new type
- `PUT /api/event-types/:id` - Update type
- `DELETE /api/event-types/:id` - Delete type

**Bookings:**
- `POST /api/bookings` - Create booking (public)
- `GET /api/bookings` - List bookings (admin)
- `POST /api/bookings/:id/cancel-public` - Cancel with token

**Schedule:**
- `GET /api/schedule/available-slots/:slug` - Get free slots

### Security Features

- JWT authentication
- CSRF protection
- Rate limiting
- Input validation (Zod)
- XSS sanitization
- Secure headers (Helmet)
- Cancellation tokens

---

## License

MIT - Use it however you want!
