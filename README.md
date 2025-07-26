# HackyStack

HackyStack is a modern environment and deployment management platform built with Next.js. It helps you manage your applications' environments and deployments to Kubernetes on AWS EC2 instances with confidence.

## Features

- **Application Management** - Create and manage multiple applications
- **Environment Control** - Deploy to multiple environments (dev, staging, production)
- **Secrets & Variables** - Secure management of application secrets and environment variables
- **Role-Based Access** - Three permission levels (Viewer, Editor, Owner)
- **GitHub OAuth** - Secure authentication with GitHub
- **Modern UI** - Built with Next.js 15, TypeScript, and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js 5.0 (beta) with GitHub provider
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker & Docker Compose

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd hacky-stack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up GitHub OAuth Application

You'll need to create a GitHub OAuth application to enable authentication:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `HackyStack Local`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 4. Configure Environment Variables

Copy the environment template and update it with your GitHub OAuth credentials:

```bash
cp .env .env.local  # Optional: create a local copy
```

Update the following variables in `.env`:

```bash
# Generate a random secret key (you can use: openssl rand -base64 32)
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth credentials from step 3
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Database URL (automatically managed by start-db.sh script)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/HackyStack"
```

### 5. Start the Database

HackyStack includes a helper script that automatically:
- Finds an available port (starting from 5432)
- Updates the DATABASE_URL in your .env file
- Starts a PostgreSQL container with Docker Compose

```bash
./start-db.sh
```

### 6. Run Database Migrations

Set up the database schema:

```bash
npx prisma migrate dev
```

### 7. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. You'll be redirected to the login page where you can sign in with GitHub.

## Database Management

### View Database Content

```bash
npx prisma studio
```

### Reset Database

```bash
npx prisma migrate reset
```

### Generate Prisma Client (after schema changes)

```bash
npx prisma generate
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/auth/        # NextAuth.js API routes
│   ├── login/           # Login page
│   ├── layout.tsx       # Root layout with SessionProvider
│   └── page.tsx         # Home page (protected)
├── auth.ts              # NextAuth.js configuration
└── middleware.ts        # Route protection middleware

prisma/
├── schema.prisma        # Database schema
└── migrations/          # Database migration files

public/                  # Static assets (logos, icons)
```

## User Roles & Permissions

- **Viewer**: Read-only access to applications, environments, and secrets/variables
- **Editor**: Can create/update/delete environments, secrets, and variables
- **Owner**: Full access including user management and role assignment

## Security Features

- All routes require authentication (except /login)
- Secret values are never displayed after creation
- Role-based access control for all operations
- Secure session management with NextAuth.js

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure Docker is running
2. Check if the database container is healthy: `docker ps`
3. Restart the database: `docker-compose restart`
4. Check logs: `docker-compose logs postgres`

### Authentication Issues

1. Verify your GitHub OAuth app settings
2. Ensure the callback URL matches exactly: `http://localhost:3000/api/auth/callback/github`
3. Check that NEXTAUTH_SECRET is set and sufficiently random
4. Clear browser cookies and try again

### Port Conflicts

The `start-db.sh` script automatically finds available ports, but if you encounter issues:

1. Stop all Docker containers: `docker-compose down`
2. Check for port usage: `lsof -i :5432`
3. Run the start script again: `./start-db.sh`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test locally
4. Commit your changes: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin feature/your-feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.