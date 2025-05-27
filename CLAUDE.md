# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a calendar-based booking management system for water filtration technicians built with Next.js 15, TypeScript, Prisma, and NextAuth.js.

**IMPORTANT: The entire application interface is in Italian language. All user-facing text, labels, messages, and error messages are in Italian.**

## Key Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
```

### Database
```bash
npx prisma migrate dev    # Run database migrations
npx prisma studio         # Open Prisma Studio GUI
npm run db:seed          # Seed database with test data (runs prisma/seed.ts)
npx prisma generate      # Regenerate Prisma client after schema changes
```

## Architecture Overview

### Authentication Flow
- Uses NextAuth.js with Google OAuth provider configured in `src/lib/auth.ts`
- Role-based access control with three roles: ADMIN, CUSTOMER_SERVICE, TECHNICIAN
- Session management with JWT tokens
- Protected routes check session server-side

### Data Model
The booking system uses these core entities:
- **User**: Auth entity with role assignment
- **Technician**: Linked to User, has color coding for calendar display
- **Booking**: Core entity linking customer, technician, date/slot with status tracking
- **TimeSlot**: Three daily slots (MORNING: 10-12, AFTERNOON: 13-15, EVENING: 16-18)

### API Design
All APIs in `src/app/api/` follow RESTful patterns:
- `/api/availability?date=YYYY-MM-DD` - Check available slots
- `/api/bookings` - CRUD operations for bookings
- APIs validate session and check user roles before processing

### Frontend Architecture
- Main calendar component: `src/components/calendar/booking-calendar.tsx`
- Uses FullCalendar for calendar rendering with custom event handling
- Modal-based booking creation with real-time availability checking
- Technician color coding for visual distinction
- **All UI text is in Italian** - includes navigation, forms, buttons, error messages, and status indicators

## Development Notes

### Adding New Features
1. Database changes require updating `prisma/schema.prisma` and running migrations
2. New API routes go in `src/app/api/` following Next.js App Router conventions
3. UI components use shadcn/ui - install new components with `npx shadcn@latest add <component>`

### Environment Variables
Required in `.env`:
```
DATABASE_URL="file:./dev.db"  # SQLite for dev, PostgreSQL for prod
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Common Patterns
- All database queries use Prisma client from `src/lib/db.ts`
- Auth checks use `getServerSession(authOptions)` from `src/lib/auth.ts`
- Date/time handling uses date-fns library with Italian locale
- Form validation happens both client-side and server-side
- **Language**: All user-facing text must be in Italian
- **Date format**: Italian convention "d MMMM yyyy" (e.g., "5 gennaio 2025")
- **Time format**: 24-hour format "HH:mm" (e.g., "14:30")