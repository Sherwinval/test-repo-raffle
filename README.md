# Entry Upload + Raffle Management

A full-stack internal raffle system for event-based participant upload, duplicate-safe entry ingestion, and secure draw management.

## Overview

This repository contains:

- `client/`: React + Vite + Tailwind CSS frontend
- `server/`: Node.js + Express backend with Prisma ORM
- Bulk upload support for CSV and Excel files
- Role-based access control for `ADMIN` and `EVENT_MANAGER`

The system is built to handle large event uploads with auditability, event scoping, and controlled draw execution.

## Key Features

- Upload participant entries by event
- Duplicate detection within uploads and against existing event entries
- Progress tracking and upload validation
- Secure raffle draw management
- Event-level authorization and role enforcement
- Export-ready result handling

## Repository Structure

- `client/`
  - `src/`: application UI, pages, components, hooks, and utilities
  - `public/`: static assets
- `server/`
  - `src/`: Express app, routes, controllers, services, middleware, and config
  - `prisma/`: Prisma schema, migrations, and seed data

## Setup

### Prerequisites

- Node.js 20+ or compatible
- npm
- PostgreSQL / Supabase database

### Install dependencies

From the repository root:

```bash
cd client && npm install
cd ../server && npm install
```

### Backend environment

Create or update `server/.env` with the required variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NODE_ENV`
- `PORT`
- `WEB_ORIGIN`


## Run the Application

### Start both client and server

From the repository root:

```bash
npm run dev
```

### Run client only

```bash
cd client && npm run dev
```

### Run server only

```bash
cd server && npm run dev
```

## Notes for Developers

### Client

- `client/src/App.jsx`: application shell and route entry point
- `client/src/features/`: feature-specific UI and logic
- `client/src/utils/`: shared helpers such as file parsing and validation

### Server

- `server/src/index.js`: Express server startup
- `server/src/routes/`: API route definitions
- `server/src/controllers/`: request handling and response flow
- `server/src/services/`: business logic implementations
- `server/src/middleware/`: auth, validation, and error handling

### Prisma

Database schema and migrations are located in `server/prisma/`.
Common Prisma commands:

```bash
cd server
npm run prisma migrate:deploy
npm run prisma validate
```

## Recommended Workflow

1. Configure `server/.env`
2. Install dependencies in `client/` and `server/`
3. Start both apps with `npm run dev`
4. Use the frontend to create events, upload entries, and manage draws

## Reference

See `ProjectOverview.md` for additional design context, user roles, and feature requirements.
