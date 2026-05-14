# Internal Raffle System — Project Overview

## Problem

Existing tools cannot handle more than 20,000 entries and provide no control over branding, event management, or audit records. The problem is also to ensure that the employee details are SECURELY stored inside a database

**Objective:** Build a scalable, internal raffle system to replace third-party tools and support recurring HR-led events.

---

## Tech Stack
- **Frontend:** React, Tailwind CSS, Vite
- **Backend:** Node.js, Express
- **ORM:** Prisma
- **Database:** Supabase (PostgreSQL)

---

## Users

Internal HR / People Ops team. Two roles: `Admin` and `Event Manager`.

### Admin
- Full system access
- Invite/revoke users (Admins and Event Managers) admins cannot be lower than  2.
- View events but dont manage events
- export results of all events
- View audit log; access system settings

### Event Manager
- Create and manage their own events (full CRUD)
- Run all operational tasks for owned + co-assigned events (upload, draw, present, export)
- Add other Event Managers as collaborators on their own events iwht specific permission for example : if i add event manager B to my event i can give him permission to upload and draw but not to export results and also i can give him permission to export results but not to upload and draw 
- Cannot manage users or access system settings
- export results of assigned events only

### Account Creation
- **No public signup.** Accounts exist only via invite from an Admin.
- First Admin bootstrapped via one-time CLI script (`npm run seed:first-admin`).
- System enforces ≥ 2 active Admins for continuity.


---

## Core Requirements

### Scale
- Support 20,000+ entries per event
- Bulk upload via CSV or Excel

### Entry Logic
- Multiple entries per employee are allowed (each entry is unique)
- Prize category scoping:
  - If an employee wins a **mini prize**, they are excluded from winning in that **same category** again
  - Employees remain eligible for **major prize** draws regardless of mini prize wins

### Participant Tracking
- Full participant info stored per entry
- Duplicate detection per upload

### Event Management
- Reusable event structure across multiple raffles
- Full audit trail of all actions and results

### UI
- Branded, customizable interface
- Reliable for live event execution

---

## Modules

### 1. Event Management
Create, configure, and manage raffle events with prize categories and draw rules.

### 2. Authentication & Role Access Control
JWT-based authentication with a 2-role model (Admin / Event Manager). No public signup —
all accounts are created via an Admin-issued invite token flow: email-bound, SHA-256 hashed,
one-time use, 24–48h expiry. First Admin is bootstrapped via a one-time CLI seed script
(`npm run seed:first-admin`); the system enforces a minimum of 2 active Admins for continuity.
Authorization is two-layered: role check (Admin vs Event Manager) plus per-event access
check (owner or assigned collaborator) for event-scoped operations.

### 3. Entry Upload ← *Current Focus*
Bulk import participant data via CSV/Excel. Validates format, deduplicates, and stores 20,000+ entries with upload progress monitoring.

### 4. Draw Engine
Randomized draw logic with prize category scoping and exclusion rules. make sure that the randomized is secure and outside actions can't affect it like operating system changes.

### 5. Live Presentation
Branded draw UI for live event display.

### 6. Results & Export
Post-draw result views and CSV/Excel export with full audit trail.

### 6. Event branding customization

### 6. Raffle style module


---

## Success Criteria
- End-to-end raffle execution entirely within the system
- No reliance on external tools
- Full flow: Upload → Draw → Present → Export



## Required Features

### 1. File Upload UI
- Drag-and-drop zone + file browser button
- Accept only `.csv` and `.xlsx` / `.xls` files
- Show selected file name and size before processing

### 2. Template Download
- Provide a downloadable CSV/Excel template with required column headers
- Required columns: `employee_id`, `full_name`, `department`, `email`, `entry_code` (unique per entry)

### 3. Client-side Validation (before upload)
- Validate file type and extension
- Validate file is non-empty
- Parse and preview first 5 rows to let the user confirm column mapping
- Detect missing required columns and surface clear error messages

### 4. Upload & Processing (backend)
- POST endpoint: `POST /api/events/:eventId/entries/upload`
- Parse CSV using `papaparse` or Excel using `xlsx` / `exceljs`
- Validate each row server-side: required fields, correct formats
- Duplicate detection:
  - Within the uploaded file (duplicate `entry_code`)
  - Against existing entries in the database for that event
- Bulk insert validated rows into Supabase via Prisma (batch in chunks of 500 to handle 20,000+ rows)
- Return a structured result: total rows, inserted count, skipped/duplicate count, error rows with reasons

### 5. Progress Monitoring
- Show a real-time progress bar during upload and processing
- Display status stages: Uploading → Parsing → Validating → Saving → Done
- If processing is async (large files), poll a job status endpoint

### 6. Results Summary
- After upload completes, show a summary card:
  - Total entries received
  - Successfully imported
  - Duplicates skipped
  - Rows with errors (with downloadable error report)

### Constraints
- Must handle 20,000+ rows without timeout — use streaming or chunked processing
- Duplicate `entryCode` within the same event must be rejected (not silently overwritten)
- All uploads must be tied to a specific `eventId`
- Endpoint protected by `protect({ role: 'EVENT_MANAGER', eventAccess: true })` middleware; `operatorId` derived from JWT


## Data Model (Prisma)

### Entry Upload
- `Entry` model linked to an `Event`
- Fields: `id`, `eventId`, `employeeId`, `fullName`, `department`, `email`, `entryCode` (unique per event), `createdAt`, `uploadBatchId`
- `UploadBatch` model for tracking each upload job: `id`, `eventId`, `status`, `totalRows`, `insertedRows`, `skippedRows`, `errors (JSON)`, `createdAt`

### Users & Authentication
```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  passwordHash     String?           // null until invite accepted
  role             Role      @default(EVENT_MANAGER)
  isActive         Boolean   @default(false)

  // Invite tracking
  inviteTokenHash  String?   @unique
  inviteExpiresAt  DateTime?
  invitedById      String?
  invitedBy        User?     @relation("UserInvites", fields: [invitedById], references: [id])
  invitedUsers     User[]    @relation("UserInvites")

  // Event relationships
  ownedEvents      Event[]   @relation("EventOwner")
  assignments      EventAssignment[]

  createdAt        DateTime  @default(now())
}

enum Role {
  ADMIN
  EVENT_MANAGER
}

model EventAssignment {
  id        String   @id @default(uuid())
  eventId   String
  userId    String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([eventId, userId])
}
```

> The `Event` model gains an `ownerId` field (FK to `User`) and an `assignments EventAssignment[]` relation.

### API Endpoints

#### Authentication
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Email + password → JWT |
| `POST` | `/api/auth/invite` | Admin | Invite user as Admin or Event Manager |
| `GET` | `/api/auth/invite/:token` | Public | Validate token before showing accept form |
| `POST` | `/api/auth/accept-invite` | Public | Token + email + password → activate account |
| `DELETE` | `/api/auth/invite/:email` | Admin | Revoke a pending invite |

#### User Management
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `PATCH` | `/api/users/:id/role` | Admin | Promote/demote (blocked if it leaves < 2 Admins) |
| `DELETE` | `/api/users/:id` | Admin | Deactivate user (blocked if it leaves < 2 Admins) |

#### Event Assignment
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/events/:eventId/assignments` | Event owner or Admin | Add a collaborator |
| `DELETE` | `/api/events/:eventId/assignments/:userId` | Event owner or Admin | Remove a collaborator |
| `GET` | `/api/events/:eventId/assignments` | Anyone with event access | List collaborators |

