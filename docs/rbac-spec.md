# RBAC Specification — Internal Raffle System

## Roles
- **Admin** — Full system access
- **Event Manager** — Scoped to owned and co-assigned events

## Legend
| Symbol | Meaning |
|---|---|
| ✅ | Allowed |
| ❌ | Denied |
| ✅ own/assigned | Allowed only on events they own or are assigned to as collaborator |
| ✅ own only | Allowed only on events they personally created |
| ⚠️ | Allowed with system constraint |

---

## Authentication

| Action | Admin | Event Manager |
|---|---|---|
| Login | ✅ | ✅ |
| Logout | ✅ | ✅ |
| Accept invite | ✅ | ✅ |

---

## User Management

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Invite Admin | ✅ | ❌ | |
| Invite Event Manager | ✅ | ❌ | |
| Revoke pending invite | ✅ | ❌ | |
| View all users | ✅ | ❌ | |
| Deactivate user | ⚠️ | ❌ | Blocked if it would leave fewer than 2 active Admins |
| Change user role (promote/demote) | ⚠️ | ❌ | Blocked if demotion would leave fewer than 2 active Admins |

---

## Event Management

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Create event | ✅ | ✅ | Event Manager becomes the owner |
| View all events | ✅ | ❌ | |
| View own / assigned events | ✅ | ✅ own/assigned | |
| Update event | ❌ | ✅ own/assigned | |
| Delete event | ❌ | ✅ own only | Collaborators cannot delete events they don't own |

---

## Collaborator Management

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Add collaborator to event | ✅ | ✅ own only | Only the event owner or Admin can add collaborators |
| Remove collaborator from event | ✅ | ✅ own only | Only the event owner or Admin can remove collaborators |
| View collaborators on event | ✅ | ✅ own/assigned | |

---

## Entry Upload

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Upload entries (CSV/Excel) | ❌ | ✅ own/assigned | |
| View entries | ❌ | ✅ own/assigned | |
| Search / filter entries | ❌ | ✅ own/assigned | |
| View upload batch results | ❌ | ✅ own/assigned | |
| Delete all entries for event | ❌ | ✅ own/assigned | |

---

## Draw

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Execute draw (select winner) | ❌ | ✅ own/assigned | |
| Confirm winner | ❌ | ✅ own/assigned | |
| Reset all draw results for event | ❌ | ✅ own/assigned | |
| View draw results | ❌ | ✅ own/assigned | |

---

## Export

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| Export entries (CSV/Excel) | ✅ | ✅ own/assigned | |
| Export draw results (CSV/Excel) | ✅ | ✅ own/assigned | |
| Export audit log | ✅ | ❌ | |

---

## Audit Log

| Action | Admin | Event Manager | Notes |
|---|---|---|---|
| View full system audit log | ✅ | ❌ | |
| View audit log for own/assigned events | ✅ | ✅ own/assigned | Event Managers see only their event-scoped entries |
| Export audit log | ✅ | ❌ | |

---

## System Settings

| Action | Admin | Event Manager |
|---|---|---|
| View system settings | ✅ | ❌ |
| Edit system settings | ✅ | ❌ |

---

## Summary Matrix

| Area | Admin | Event Manager |
|---|---|---|
| Auth | Full | Full |
| User Management | Full | None |
| Events | Full (all events) | Full CRUD (own), Operational (assigned) |
| Collaborators | Full (all events) | Manage (own events only) |
| Entry Upload | Full (all events) | Full (own/assigned events) |
| Draw | Full (all events) | Full (own/assigned events) |
| Export | Full | Entries + Results only (own/assigned) |
| Audit Log | Full system view | Own/assigned event entries only |
| System Settings | Full | None |
