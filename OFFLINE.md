# SmartOT Offline-First Synchronization Architecture

## 1. Overview

Hospital environments frequently experience transient network dead-zones (e.g. basement sterile storage, shielded radiology suites, transit elevators). SmartOT incorporates an **offline-first event synchronization queue** to guarantee that critical staff actions (consent sign-offs, checklist updates, QR scans, transport triggers) are never lost during network interruptions.

---

## 2. Synchronization Flow

```
User Action (Staff verifies consent in Ward)
   │
   ▼
Generate Local Mutation & Unique Idempotency Key (`idemp_<timestamp>_<hash>`)
   │
   ▼
Is Browser / Device Online?
   ├── YES ──► Send API Request Directly ──► Server Validates & Acknowledges
   │
   └── NO  ──► Enqueue into Persistent Local Storage (`smartot_offline_events_queue`)
                 │
                 ▼
               Network Restores (`window.addEventListener('online')`)
                 │
                 ▼
               Flush Batch Queue to `POST /api/sync/events`
                 │
                 ▼
               Server Ingests with Idempotency Check (Prevents Duplication)
                 │
                 ▼
               Server Acknowledges ──► Local Queue Purged ──► UI Emits Sync Toast
```

---

## 3. Idempotency & Conflict Prevention

- Every offline event carries an immutable `idempotencyKey`.
- When the backend receives a batch via `POST /api/sync/events`:
  1. Checks if the `idempotencyKey` already exists in `workflow_events`.
  2. If found, returns the previously saved event without re-applying duplicate side-effects.
  3. If new, applies the state transition, records the audit trail, and evaluates active alert triggers.
- This guarantees safe retry mechanisms and prevents accidental double-transitions.
