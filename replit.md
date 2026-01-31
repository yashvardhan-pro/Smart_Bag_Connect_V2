# SmartBag OS

## Overview

SmartBag OS is a mobile-first web application for managing a Bluetooth-connected smart school bag. The app connects to an HM-10 Bluetooth module to receive intrusion alerts and send timetable data to the bag's embedded system. Core features include real-time security monitoring, weekly timetable management, and alert logging with full-screen alarm notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions and alert overlays
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared components. Pages include Dashboard, Timetable, Alerts, and Settings. The app uses a cyberpunk-themed dark UI with neon accents.

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in a shared routes file with Zod validation
- **Build**: esbuild for server bundling, Vite for client

The server handles timetable CRUD operations and alert logging. Routes are defined declaratively in `shared/routes.ts` with input/output schemas, enabling type-safe API contracts between client and server.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

Two main tables:
1. `timetables` - Stores daily subject schedules (day, subject1, subject2)
2. `alerts` - Logs intrusion alerts with timestamps and read status

### Bluetooth Integration
- **Protocol**: Web Bluetooth API
- **Device**: HM-10 module (Service UUID: 0000ffe0, Characteristic: 0000ffe1)
- **Features**: 
  - Receive "ALERT" messages to trigger full-screen alarms with sound and vibration
  - Send timetable data in format "DAY:MON,SUB:Math,Eng"

The Bluetooth logic lives in `use-bluetooth.ts` hook, managing connection state, data parsing, and alarm triggering.

### Key Design Patterns
- Shared schema and route definitions between frontend and backend
- Type inference from Drizzle schemas using `$inferSelect` and `$inferInsert`
- Custom hooks for all data fetching and Bluetooth operations
- Component composition with shadcn/ui primitives

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle ORM for type-safe queries
- connect-pg-simple for session storage (available but not currently used)

### UI Libraries
- shadcn/ui components (Radix UI primitives)
- Framer Motion for animations
- Lucide React for icons
- date-fns for timestamp formatting

### Browser APIs
- Web Bluetooth API (requires HTTPS or localhost)
- Web Audio API for alarm sounds
- Vibration API for haptic feedback

### Build Tools
- Vite with React plugin
- esbuild for production server bundling
- Replit-specific plugins for development (cartographer, dev-banner, error overlay)