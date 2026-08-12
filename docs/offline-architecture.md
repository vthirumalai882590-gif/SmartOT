# SmartOT Command: Offline-First Architecture & Event Sync

## 1. Context & Motivation
Hospitals in developing or resource-constrained environments frequently experience intermittent local network outages and Wi-Fi dead zones in basement CSSD departments or shielded Operating Theatres.

SmartOT Command implements an **Offline-First Event Queue** to guarantee zero data loss during connectivity disruptions.

---

## 2. Synchronization Architecture

```mermaid
sequenceDiagram
    participant User as Staff (Ward / CSSD / OT)
    participant Client as Frontend (IndexedDB / LocalStore)
    participant Sync as Sync Manager
    participant Server as Backend API (/api/sync/events)
    participant EventEngine as Workflow Event Engine

    User->>Client: Perform Action (Scan QR, Check Readiness, Transition State)
    alt Network Online
        Client->>Server: HTTP POST /api/endpoint
        Server->>EventEngine: Persist & Emit Immutable Event
        Server-->>Client: 200 OK
    else Network Offline
        Client->>Client: Enqueue Action in Local Queue (state = PENDING_SYNC)
        Client-->>User: UI Badge flips to "Offline (X queued)"
    end

    Note over Client,Server: Connectivity Restored (window.online event)
    Sync->>Client: Read PENDING_SYNC Queue
    Sync->>Server: HTTP POST /api/sync/events (Batched payload with Idempotency Keys)
    Server->>EventEngine: Ingest & Deduplicate Events
    Server-->>Sync: 200 OK (Synced Count)
    Sync->>Client: Purge Synced Items & Display "Sync Complete"
```

---

## 3. Idempotency & Deduplication
Every queued offline event generates a unique UUID-based `idempotencyKey`. When the sync payload reaches the server, the backend verifies that duplicate events are not re-executed, preserving historical timeline integrity.
