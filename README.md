# Virtus Booking System

A calendar-based booking management system for water filtration technicians.

## Features

- **Google Authentication**: Secure login using Google Workspace accounts
- **Role-based Access**: Admin, Customer Service, and Technician roles
- **Smart Booking Logic**: 
  - 3 time slots per day (10-12, 13-15, 16-18)
  - Automatic availability checking
  - Technician assignment upon booking
- **Calendar View**: Visual booking management with FullCalendar
- **API Endpoints**: For integration with external AI agents

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: SQLite for development, PostgreSQL for production
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 4. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed with test data
npm run db:seed
```

Test users created:
- `tech1@virtus.com` - John Smith (Technician)
- `tech2@virtus.com` - Sarah Johnson (Technician)
- `tech3@virtus.com` - Mike Williams (Technician)
- `cs@virtus.com` - Customer Service
- `admin@virtus.com` - Admin User

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Check Availability
```
GET /api/availability?date=2024-05-23

Response:
{
  "date": "2024-05-23",
  "slots": {
    "10-12": {
      "John Smith": { "available": true, "id": "tech1", "name": "John Smith" },
      "Sarah Johnson": { "available": false, "id": "tech2", "name": "Sarah Johnson" }
    },
    ...
  }
}
```

### Create Booking
```
POST /api/bookings

Body:
{
  "date": "2024-05-23",
  "slot": "10-12",
  "technicianId": "tech1",
  "customer": {
    "name": "John Doe",
    "phone": "555-0123",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "installationType": "standard",
  "notes": "Second floor apartment"
}
```

## Production Deployment

1. Switch to PostgreSQL:
   - Update `DATABASE_URL` in `.env`
   - Update `provider` in `prisma/schema.prisma` to `"postgresql"`
   
2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Build for production:
   ```bash
   npm run build
   npm start
   ```

## User Roles

- **Admin**: Full system access, user management
- **Customer Service**: Create, update, delete bookings
- **Technician**: View their own calendar (read-only)

## Development Notes

- Calendar events are color-coded by technician
- Bookings can be created by clicking on any date
- Only available slots are shown in the booking form
- Customer information is saved for future reference