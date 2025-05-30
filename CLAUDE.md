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

### MCP Server (Standalone Service)
```bash
cd mcp-server        # Navigate to MCP server directory
npm run dev          # Start MCP server in development
npm run build        # Build MCP server TypeScript
npm start            # Start MCP server in production
npm run db:generate  # Generate Prisma client for MCP server
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
- **User**: Auth entity with role assignment, invitation system for new users
- **Technician**: Linked to User, has color coding for calendar display
- **Booking**: Core entity linking customer, technician, date/slot with status tracking
- **TimeSlot**: Three daily slots (MORNING: 10-12, AFTERNOON: 13-15, EVENING: 16-18)
- **UserInvitation**: Manages email invitations for new users with role pre-assignment
- **ApiToken**: Bearer tokens for API authentication with scopes (read/write)
- **Customer**: Customer information stored for bookings
- **InstallationType**: Types of water filter installations

### API Design
All APIs in `src/app/api/` follow RESTful patterns:
- `/api/availability?date=YYYY-MM-DD` - Check available slots
- `/api/bookings` - CRUD operations for bookings
- `/api/bookings/[id]/status` - Update booking status
- `/api/users` - User management (admin only)
- `/api/users/[id]` - Edit/delete specific users (self-edit allowed)
- `/api/technicians` - Technician management
- `/api/invitations` - Send user invitations (admin only)
- `/api/tokens` - API token management (create, list, revoke)
- `/api/impersonate` - Admin user impersonation
- `/api/mcp` - Model Context Protocol server for LLM integration
- APIs validate session and check user roles before processing

### Frontend Architecture
- Main calendar component: `src/components/calendar/booking-calendar.tsx`
- Uses FullCalendar for calendar rendering with custom event handling
- Modal-based booking creation with real-time availability checking
- Technician color coding for visual distinction
- **All UI text is in Italian** - includes navigation, forms, buttons, error messages, and status indicators

### UI Components & Libraries
- **Sidebar Navigation**: Uses shadcn's new sidebar component with collapsible groups
- **Dialogs & Modals**: shadcn dialog, drawer (for mobile-friendly forms), and alert-dialog
- **Notifications**: Sonner for toast notifications (replacing shadcn toast)
- **Chat Interface**: Custom chat components with markdown support via react-markdown
- **Form Components**: Input, label, button, select, textarea from shadcn/ui
- **Data Display**: Card, avatar, scroll-area, skeleton for loading states
- **Custom Hooks**:
  - `useConfirm`: Replacement for browser confirm() with styled dialogs
  - `useIsMobile`: Responsive behavior detection
  - `useTodo`: Task management (if applicable)

### Navigation Structure
```typescript
// Main navigation in sidebar
- Calendario (/)
- Appuntamenti (/appointments)  
- Chat Assistenza (/chat)
- Documentazione (/docs) - Admin only
- Impostazioni (collapsible group)
  - Il Mio Account (/account)
  - Gestione Utenti (/users) - Admin only
  - Gestione Tecnici (/technicians) - Admin only
  - Token API (/api-tokens) - Admin only
```

### Chat Assistant Feature
The AI booking assistant (`/chat`) provides conversational booking interface:
- **Components**: 
  - `ChatMessage`: Renders user/assistant messages with markdown support
  - `ChatInput`: Auto-resizing textarea with send functionality
  - `Chat`: Main container managing conversation state
- **n8n Integration**: Connected to n8n webhook for AI-powered responses
- **Webhook URL**: Configurable via `NEXT_PUBLIC_N8N_WEBHOOK_URL` or defaults to production webhook
- **Session Management**: Unique session ID per chat for context persistence
- **Conversation History**: Full chat history sent with each request for context-aware responses

## Development Notes

### Adding New Features
1. Database changes require updating `prisma/schema.prisma` and running migrations
2. New API routes go in `src/app/api/` following Next.js App Router conventions
3. UI components use shadcn/ui - install new components with `npx shadcn@latest add <component>`
4. For React 19 compatibility issues with shadcn, use manual component creation when needed

### Environment Variables
Required in `.env`:
```
DATABASE_URL="file:./dev.db"  # SQLite for dev, PostgreSQL for prod
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
# Email configuration (for user invitations)
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="noreply@example.com"
# n8n webhook for AI chat (optional)
NEXT_PUBLIC_N8N_WEBHOOK_URL="https://n8n.moretti.cc/webhook/..."
```

### Common Patterns
- All database queries use Prisma client from `src/lib/db.ts`
- Auth checks use `getServerSession(authOptions)` from `src/lib/auth.ts`
- Date/time handling uses date-fns library with Italian locale
- Form validation happens both client-side and server-side
- **API Calls**: Always use `api-client.ts` methods (`api.get`, `api.post`, etc.) for CSRF protection
- **Authentication**: Use `validateApiAuth()` in API routes for both session and token auth
- **Language**: All user-facing text must be in Italian
- **Date format**: Italian convention "d MMMM yyyy" (e.g., "5 gennaio 2025")
- **Time format**: 24-hour format "HH:mm" (e.g., "14:30")
- **Confirmations**: Use `useConfirm` hook instead of browser confirm()
- **Notifications**: Use `toast` from Sonner for all user feedback
- **Mobile Forms**: Use Drawer component for better mobile UX
- **Loading States**: Show skeletons or spinners during async operations
- **Error Handling**: Always return proper error messages in Italian

## Recent Features

### API Token Authentication
- Bearer token authentication for external API access
- Token management UI at `/api-tokens` (admin only)
- Scopes system: `read` for viewing data, `write` for modifications
- Tokens can be created, named, and revoked
- All API endpoints support both session and token authentication

### User Impersonation
- Admins can impersonate other users for debugging
- Blue banner shows when impersonating
- Maintains original user context for easy switching back
- Access via user menu in user management page

### Model Context Protocol (MCP) Server
**IMPORTANT: MCP server is now deployed as a standalone Express service on Railway, separate from the Next.js app.**

#### Architecture
- **Standalone Express Server**: Located in `/mcp-server/` directory
- **Separate Railway Service**: Independent deployment with dedicated URL
- **Shared Database**: Uses same PostgreSQL database as main app via `DATABASE_URL`
- **Official MCP SDK**: Uses `@modelcontextprotocol/sdk` with proper SSE transport

#### MCP Server Endpoints
- `GET /health` - Health check endpoint
- `GET /mcp/info` - Server capabilities and available tools
- `GET /mcp/sse` - Standard MCP SSE transport endpoint (requires Bearer token)
- `POST /mcp/sse` - HTTP JSON-RPC fallback endpoint (requires Bearer token)

#### MCP Tools Available
1. **check_availability** - Check technician availability for dates
2. **create_booking** - Create new appointments with customer details
3. **modify_booking** - Modify existing bookings (date, time, technician)
4. **cancel_booking** - Cancel appointments with optional reason
5. **get_bookings** - List bookings with various filters

#### Authentication & Integration
- **Bearer Token Authentication**: Uses same API tokens from main app database
- **n8n Integration**: Standard MCP SSE client support
- **Claude Desktop**: Compatible via SSE transport
- **Session Management**: Maintains user context across tool calls
- **Full Node.js Runtime**: No edge function limitations

#### Deployment Notes
- **Railway Services**: Two separate services in same project
  - `Virtus-app-nodejs`: Main Next.js booking application
  - `mcp-server`: Standalone MCP server (Express + TypeScript)
- **Environment Variables**: Requires same `DATABASE_URL` as main app
- **Schema Sync**: `/mcp-server/prisma/schema.prisma` must match main schema

### Documentation System
- Comprehensive API documentation at `/docs`
- Interactive examples with copy buttons
- Separate pages for each API endpoint
- MCP integration guide with n8n examples

### UI Enhancements
- Appointment filtering: Checkbox to exclude cancelled appointments
- Sidebar navigation: Cleaned up for non-admin users
- Mobile-responsive drawer forms
- Improved error messages in Italian

## Recent Improvements (May 2025)

### Security Enhancements
- Implemented comprehensive CSRF protection with token validation
- Added rate limiting for API endpoints
- Input validation using Zod schemas
- HTML sanitization with DOMPurify
- Content Security Policy (CSP) configuration

### API Client Architecture
- Created centralized `api-client.ts` for all frontend API calls
- Automatic CSRF token handling for all non-GET requests
- Session cookie management with `credentials: 'same-origin'`
- Consistent error handling across all API calls

### Authentication Fixes
- Fixed session cookie transmission in API calls
- Resolved 403 Forbidden errors on authenticated endpoints
- Added missing imports in API routes (getEffectiveUser)
- Improved error logging for debugging

### Production Deployment
- Successfully deployed on Railway with PostgreSQL
- Fixed NextAuth peer dependency issues with legacy-peer-deps
- Created railway.toml for proper build configuration
- Set up environment variables for production

### Demo Data
- Created comprehensive seed script for June 2025
- 3 demo technicians with color coding
- 54 demo appointments with realistic Italian customer data
- Random distribution across time slots and technicians

### n8n Integration
- Implemented standard MCP SSE transport endpoint
- Full compatibility with n8n MCP Client node
- Proper CORS headers for cross-origin requests
- Comprehensive documentation for n8n setup

## Known Issues & Solutions

### Windows/WSL Development
- `.next/trace` file corruption can occur on Windows/WSL
- Solution: Delete `.next` folder from Windows Explorer (not WSL)
- Alternative: Create clean project directory and copy files

### TypeScript Strict Mode
- Some type assertions needed for MCP SDK compatibility
- Use `@ts-ignore` sparingly for transport type mismatches

### Railway Deployment
- Use `NPM_CONFIG_LEGACY_PEER_DEPS=true` for NextAuth compatibility
- Ensure DATABASE_URL uses public endpoint for migrations
- Check Railway logs for build errors

### MCP Server Deployment
- **Schema Synchronization**: When updating Prisma schema, copy changes to `/mcp-server/prisma/schema.prisma`
- **Environment Variables**: MCP server requires same `DATABASE_URL` as main app
- **Docker Symlinks**: Symlinks don't work in Railway builds - use file copies instead
- **Prisma Generation**: MCP server runs `prisma generate` during build via `postinstall` script