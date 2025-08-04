# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Database Management

- **Start database**: `./start-db.sh` - Automatically finds available port and starts PostgreSQL
- **Database migrations**: `npx prisma migrate dev` - Apply schema changes
- **View database**: `npx prisma studio` - Open Prisma Studio GUI
- **Reset database**: `npx prisma migrate reset` - Reset and re-seed database
- **Generate Prisma client**: `npx prisma generate` - After schema changes

### Development Server

- **Start dev server**: `npm run dev` - Runs Next.js with Turbopack
- **Build project**: `npm run build` - Production build
- **Start production**: `npm start` - Run production build
- **Lint code**: `npm run lint` - ESLint with Next.js config

### Testing

This project currently has no test suite configured. Only dependency tests exist in node_modules.

## Architecture Overview

### Core Technology Stack

- **Framework**: Next.js 15 with App Router and TypeScript
- **Authentication**: NextAuth.js 5.0 (beta) with GitHub OAuth provider
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS 4.0 with Geist fonts
- **Deployment**: Docker & Docker Compose ready

### Database Schema Architecture

The application uses a multi-tenant architecture centered around Applications:

- **Users**: GitHub OAuth authenticated users with role-based access
- **Applications**: Core entity that groups environments, secrets, and variables
- **ApplicationUser**: Junction table with roles (VIEWER, EDITOR, OWNER)
- **Environments**: Deployment targets (dev, staging, production) per application
- **Secrets**: Encrypted key-value pairs assigned to environments
- **Variables**: Plain-text environment variables assigned to environments

### Authentication & Authorization

- Email-based authorization in `src/lib/auth-config.ts` with AUTHORIZED_EMAILS array
- Database sessions via Prisma adapter
- Role-based permissions: VIEWER (read-only), EDITOR (CRUD on envs/secrets/vars), OWNER (full access)
- Custom sign-in/error pages at `/auth/signin` and `/auth/error`

### API Route Structure

RESTful API routes follow this pattern:

- `/api/applications` - CRUD operations for applications
- `/api/applications/[id]/environments` - Environment management
- `/api/applications/[id]/secrets` - Secret management
- `/api/applications/[id]/variables` - Variable management
- `/api/environments/[id]` - Individual environment operations
- `/api/secrets/[id]` and `/api/variables/[id]` - Individual resource operations

### Key Components

- **Header**: Global navigation with user menu
- **UserMenu**: Authentication state and sign out
- **Layout**: Session provider wrapper with Tailwind styling

### Environment Configuration

Required environment variables:

- `NEXTAUTH_SECRET` - Session encryption key
- `NEXTAUTH_URL` - Application URL
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` - OAuth credentials
- `DATABASE_URL` - PostgreSQL connection (auto-managed by start-db.sh)

### Development Workflow

1. Start database with `./start-db.sh` (handles port conflicts automatically)
2. Run migrations with `npx prisma migrate dev`
3. Start development server with `npm run dev`
4. View database content with `npx prisma studio`

### Security Considerations

- Secret values are encrypted and never displayed after creation
- Email-based access control prevents unauthorized GitHub users
- Database sessions provide server-side session management
- Role-based permissions control application access levels
