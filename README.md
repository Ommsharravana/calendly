# Calendly Clone

Your own personal scheduling app - no subscription needed!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ommsharravana/calendly&env=JWT_SECRET&envDescription=Secret%20key%20for%20authentication%20(use%20a%20random%20string)&envLink=https://github.com/Ommsharravana/calendly%23environment-variables&project-name=my-calendly&repository-name=my-calendly&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D)

## What is this?

This is a **free, self-hosted alternative to Calendly**. You can:

- Let people book meetings with you
- Set your available hours
- Create different meeting types (15min calls, 1-hour meetings, etc.)
- Get email notifications when someone books
- No monthly fees!

---

## Deploy to Vercel (Easiest - One Click!)

### Step 1: Click the Deploy Button

Click the blue **"Deploy with Vercel"** button above.

### Step 2: Create a Vercel Account (if you don't have one)

- Sign up with GitHub, GitLab, or email
- It's free!

### Step 3: Configure Your App

When prompted:

1. **JWT_SECRET**: Enter any random text (like `mysecretkey123abc`) - this keeps your app secure
2. Click **"Deploy"**

### Step 4: Wait for Deployment

- Vercel will automatically set up your database
- This takes about 2-3 minutes
- You'll see a green checkmark when done

### Step 5: Open Your App

1. Click **"Continue to Dashboard"**
2. Click **"Visit"** to open your app
3. Create your admin account
4. Start scheduling!

### Your Booking Link

After deployment, your public booking page will be at:
```
https://your-app-name.vercel.app/book
```

Share this link with anyone who wants to book time with you!

---

## Environment Variables

When deploying to Vercel, you need to set:

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for authentication | `your-random-secret-key-here` |

The database (Vercel Postgres) is automatically configured when you click the deploy button.

---

## Run Locally (Alternative)

If you prefer to run this on your own computer:

### Step 1: Install Node.js

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** version
3. Install it

### Step 2: Download and Run

```bash
git clone https://github.com/Ommsharravana/calendly.git
cd calendly
./setup.sh
```

### Step 3: Open Your App

Go to **http://localhost:5173** in your browser.

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
- **Vercel**: `https://your-app-name.vercel.app/book`
- **Local**: `http://localhost:5173/book`

Share this link with anyone who wants to book time with you!

### Managing Bookings

- View all your upcoming and past meetings in the **Bookings** page
- Cancel or reschedule meetings if needed

---

## Troubleshooting

### Vercel Deployment Issues

**"Build failed"**
- Make sure all environment variables are set
- Try redeploying from the Vercel dashboard

**"Database connection error"**
- The Postgres database should be auto-created
- Check Vercel Dashboard → Storage → Postgres

### Local Setup Issues

**"Command not found"**
```bash
cd calendly
./setup.sh
```

**"Node is not recognized"**
- Install Node.js from [nodejs.org](https://nodejs.org/)

---

## For Developers

### Project Structure

```
calendly/
├── api/                  # Vercel serverless functions
│   ├── auth/            # Authentication endpoints
│   ├── bookings/        # Booking endpoints
│   ├── event-types/     # Event type endpoints
│   ├── availability/    # Availability endpoints
│   ├── schedule/        # Schedule endpoints
│   ├── settings/        # Settings endpoints
│   └── _lib/            # Shared utilities
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # React pages
│   │   ├── components/  # Reusable components
│   │   └── context/     # Auth state
├── backend/             # Local development server (SQLite)
├── vercel.json          # Vercel configuration
└── README.md
```

### API Endpoints

**Auth:**
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/setup` - Create admin account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Event Types:**
- `GET /api/event-types?active=true` - Public: list active types
- `GET /api/event-types` - Admin: list all types
- `POST /api/event-types` - Create new type
- `PUT /api/event-types/:id` - Update type
- `DELETE /api/event-types/:id` - Delete type

**Bookings:**
- `POST /api/bookings` - Create booking (public)
- `GET /api/bookings` - List bookings (admin)
- `POST /api/bookings/cancel-public` - Cancel with token

**Schedule:**
- `GET /api/schedule/available-slots/:slug` - Get free slots

---

## License

MIT - Use it however you want!
