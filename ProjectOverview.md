# Internal Raffle System — Project Overview

## Problem
Existing tools cannot handle more than 20,000 entries and provide no control over branding, event management, or audit records.

**Objective:** Build a scalable, internal raffle system to replace third-party tools and support recurring HR-led events.

---

## Tech Stack
- **Frontend:** React, Tailwind CSS, Vite
- **Backend:** Node.js, Express
- **ORM:** Prisma
- **Database:** Supabase (PostgreSQL)

---

## Users
- Internal HR / People Ops team
- Role-based access: `operator` and `admin`

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

### 2. Role & Access Control
Admin vs operator permissions scoped per event.

### 3. Entry Upload ← *Current Focus*
Bulk import participant data via CSV/Excel. Validates format, deduplicates, and stores 20,000+ entries with upload progress monitoring.

### 4. Draw Engine
Randomized draw logic with prize category scoping and exclusion rules.

### 5. Live Presentation
Branded draw UI for live event display.

### 6. Results & Export
Post-draw result views and CSV/Excel export with full audit trail.

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
- No auth implementation needed for this module — assume `operatorId` is available in request context


## Data Model (Prisma)
Plan the schema for:
- `Entry` model linked to an `Event`
- Fields: `id`, `eventId`, `employeeId`, `fullName`, `department`, `email`, `entryCode` (unique per event), `createdAt`, `uploadBatchId`
- `UploadBatch` model for tracking each upload job: `id`, `eventId`, `status`, `totalRows`, `insertedRows`, `skippedRows`, `errors (JSON)`, `createdAt`