# Entry Upload + Raffle Management

A full-stack internal raffle system for event-based participant upload, duplicate-safe entry ingestion, and secure draw management.

## Project Scope

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL (Supabase)
- Upload support: CSV / Excel
- Roles: `ADMIN` and `EVENT_MANAGER`

## Features

- Event-driven entry upload with duplicate detection
- Bulk import for 20,000+ rows
- Progress tracking during upload and validation
- Secure, auditable raffle/draw logic
- Role-based authorization and event access control
- Export-ready result handling

## Repository Structure

- `client/` — React application
  - `src/` — UI, features, utilities, styles
  - `public/` — static assets
- `server/` — Express API and Prisma data model
  - `src/` — controllers, services, routes, middleware, config
  - `prisma/` — schema and migrations

## Setup

### Prerequisites

- Node.js 20+ (or compatible)
- npm
- PostgreSQL / Supabase database

### Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### Environment

The backend uses environment variables stored in `server/.env`.
Required values include:

- `DATABASE_URL`
- `DIRECT_URL`
- `NODE_ENV`
- `PORT`
- `WEB_ORIGIN`

> `server/.env` is already configured for local development in this workspace.

## Running the Application

### Start both client and server

From the repository root:

```bash
npm run dev
```

This runs:

- `client`: `npm run dev`
- `server`: `npm run dev`

### Run client only

```bash
cd client && npm run dev
```

### Run server only

```bash
cd server && npm run dev
```

## Development Notes

### Client

- `client/src/App.jsx` is the entry point for UI navigation and feature composition
- `client/src/features/` contains feature-specific UI, logic, and service code
- `client/src/utils/` contains shared helpers such as file parsing and validation

### Server

- `server/src/index.js` boots Express
- `server/src/routes/` defines API endpoints
- `server/src/controllers/` handles request flows
- `server/src/services/` contains business logic
- `server/src/middleware/` enforces auth, validation, and error handling

### Prisma

Server schema and migrations are managed in `server/prisma/`.

Common commands:

```bash
cd server
npm run prisma migrate:deploy
npm run prisma:validate
```

## Notes

- Upload processing is designed to support large CSV/Excel imports and avoid duplicate `entry_code` collisions.
- Event access is enforced at the API layer for `EVENT_MANAGER` and `ADMIN` roles.
- The UI includes a dedicated entry upload flow and a raffle draw flow with secure randomization.

## Contact

For questions or next steps, open `ProjectOverview.md` or inspect the `server` and `client` folders for implementation details.
