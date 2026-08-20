# SmartOT REST API Specification

## 1. Authentication & Security

All private endpoints require Bearer JWT authentication:
```http
Authorization: Bearer <jwt_token>
```

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OT_TRANSITION",
    "message": "Cannot transition OT-03 from SCHEDULED to SURGERY_STARTED",
    "details": []
  }
}
```

---

## 2. API Endpoints

### Authentication
- `POST /api/auth/login`: Authenticate with email & password.
- `GET /api/auth/me`: Retrieve current user profile and role claims.

### Command Center & Dashboard
- `GET /api/dashboard/command-center`: Real-time aggregated hero metrics, KPIs, active OTs, critical alerts, bottlenecks, and next-best actions.

### Patients & Pre-Op Readiness
- `GET /api/patients`: List all admitted surgical inpatients with readiness scores.
- `GET /api/patients/:id`: Retrieve single patient by ID or MRN.
- `POST /api/patients/:id/readiness`: Update 6-point pre-op checklist items.
- `POST /api/patients/:id/consent`: Update surgical consent status (`PENDING`, `VERIFIED`, `MISSING`).

### Operating Theatres & Surgeries
- `GET /api/ot/schedule`: Retrieve all 4 operating theatre rooms and scheduled surgeries with real-time delay risk assessments.
- `GET /api/ot/:id/timeline`: Immutable timeline of all events associated with a room.
- `POST /api/ot/schedule-case`: Schedule a new surgical procedure.
- `POST /api/ot/:id/transition`: Transition operating theatre state along the standard state machine.

### Patient Transfers
- `GET /api/transfers`: List all active and completed patient transfers.
- `POST /api/transfers/start`: Initiate patient ward-to-OT transfer (`IN_TRANSIT`).
- `POST /api/transfers/arrive`: Mark patient arrived at surgical suite (`COMPLETED`).

### CSSD Sterile Pack Tracking
- `GET /api/cssd/packs`: List all sterilization instrument packs.
- `POST /api/cssd/scan`: Perform live QR/barcode validation (checks expiry, sterility, tray type, and active deployment).
- `POST /api/cssd/packs/:id/transition`: Update CSSD pack lifecycle state (`COLLECTED` → `STERILIZING` → `STERILIZED` → `STORED` → `AVAILABLE` → `ASSIGNED` → `IN_USE` → `RETURNED` → `REPROCESSING`).

### Operational Alerts
- `GET /api/alerts`: List open, acknowledged, and resolved alerts with role filters.
- `PATCH /api/alerts/:id`: Acknowledge or resolve an operational alert.

### Analytics & Intelligence
- `GET /api/analytics/bottlenecks`: Top delay bottlenecks categorized by transfer, CSSD, turnover, and consent.
- `GET /api/analytics/utilization`: Theatre-by-theatre occupancy, turnover, and idle time breakdown.
- `GET /api/analytics/cssd-demand`: Predictive instrument pack demand forecasting for upcoming surgeries.
- `GET /api/analytics/next-best-actions`: Prioritized operational next-best actions ranked by impact score.
- `GET /api/analytics/surgeries/:id/root-cause`: Deterministic root cause analysis for delayed surgical cases.
- `POST /api/simulation/what-if`: What-if capacity and utilization gain simulation based on turnover/transfer reductions.

### AI Operations Consultant
- `POST /api/ai/consultant/ask`: Submit natural language operational query; receives structured evidence-based advisory response.
- `GET /api/ai/context`: Live operational telemetry context snapshot.
- `GET /api/ai/history`: Audit log of previous AI queries and generated recommendations.

### Offline-First Event Synchronization
- `POST /api/sync/events`: Ingest batched offline events with idempotency keys; prevents duplicate mutations.

### Admin & Master Data Management
- `GET /api/admin/settings`, `PATCH /api/admin/settings`: Benchmark thresholds and system parameters.
- `GET /api/admin/ots`, `POST /api/admin/ots`, `PATCH /api/admin/ots/:id`: Master theatre management.
- `GET /api/admin/cssd/packs`, `POST /api/admin/cssd/packs`, `PATCH /api/admin/cssd/packs/:id`: Tray indexing.
- `GET /api/admin/patients`, `POST /api/admin/patients`, `PATCH /api/admin/patients/:id`: Patient directory.
- `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`: User access management.
- `GET /api/admin/data-stats`: Aggregate database records count.
- `GET /api/admin/export/:entity`: Export CSV/JSON data.
- `POST /api/admin/reset-demo`: Reset system to baseline hackathon demo state.
- `GET /api/admin/system-health`: System uptime, memory, and database connection status.
