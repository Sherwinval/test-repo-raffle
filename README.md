# Entry Upload System

Simple full-stack system for importing participant data into Supabase/Postgres via Prisma.

## Structure
- `server/` - Express backend, Prisma, file parsing.
- `client/` - Vite + React + Tailwind frontend.

## Notes
- Supabase credentials are left as placeholders in `server/.env.example`.
- Duplicate detection is implemented using `email` as the unique participant key.
- Supported columns include `email`, `employee id`, `role`, `site`, `firstname`, and `lastname`.
- Upload progress is exposed by `GET /api/upload/progress/:uploadId`.

## Getting Started
1. Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL`.
2. Run `npm install --workspaces`.
3. Generate Prisma client:
   - `cd server`
   - `npx prisma generate`
4. Start backend and frontend in separate terminals:
   - `npm run dev:server`
   - `npm run dev:client`
