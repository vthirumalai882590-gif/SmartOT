# SmartOT Database Architecture & Schema Documentation

## 1. Relational Database Overview

SmartOT Command employs a normalized PostgreSQL relational database schema with full support for foreign keys, constraints, multi-column indexes, transactions, and automated migration management.

### Persistence Modes:
1. **Production / Staging**: Dedicated PostgreSQL instance (via `DATABASE_URL` or standard PG connection parameters) with connection pooling and automated migration execution.
2. **Local / Offline Fallback**: Embedded transactional persistence adapter ensuring zero-downtime execution and rapid testing across all operating environments.

---

## 2. Entity Relationship Model & Relational Tables

### 1. `roles`
*Defines security roles and granular permission sets across the hospital.*
- `role_name` (`VARCHAR(50)`, Primary Key): `ADMINISTRATOR`, `OT_MANAGER`, `CSSD_STAFF`, `WARD_STAFF`
- `description` (`TEXT`)
- `permissions` (`JSONB`, Defaults to `[]`)
- `created_at` (`TIMESTAMPTZ`)

### 2. `users`
*Staff credentials and department allocations.*
- `id` (`VARCHAR(64)`, Primary Key)
- `email` (`VARCHAR(255)`, Unique, Indexed)
- `password_hash` (`VARCHAR(255)`)
- `name` (`VARCHAR(255)`)
- `role` (`VARCHAR(50)`, FK → `roles.role_name`)
- `department` (`VARCHAR(100)`)
- `created_at`, `updated_at` (`TIMESTAMPTZ`)

### 3. `operating_theatres`
*Surgical suite rooms, state progression, and active turnover timing.*
- `id` (`VARCHAR(64)`, Primary Key)
- `code` (`VARCHAR(50)`, Unique, Indexed): `OT-01`, `OT-02`, `OT-03`, `OT-04`
- `name` (`VARCHAR(255)`)
- `specialty` (`VARCHAR(255)`)
- `current_status` (`VARCHAR(50)`, Indexed): `SCHEDULED`, `PREPARING`, `PATIENT_READY`, `PATIENT_TRANSFER`, `PATIENT_ARRIVED`, `OT_READY`, `SURGERY_STARTED`, `SURGERY_COMPLETED`, `TURNOVER`, `AVAILABLE`, `DELAYED`
- `active_surgery_id` (`VARCHAR(64)`)
- `turnover_started_at` (`TIMESTAMPTZ`)
- `expected_turnover_minutes` (`INTEGER`, Default `25`)
- `current_delay_minutes` (`INTEGER`, Default `0`)
- `risk_level` (`VARCHAR(20)`, Default `'LOW'`)
- `last_updated` (`TIMESTAMPTZ`)

### 4. `patients`
*Inpatient admissions and demographic records.*
- `id` (`VARCHAR(64)`, Primary Key)
- `mrn` (`VARCHAR(64)`, Unique, Indexed): Medical Record Number (e.g. `MRN-2026-1024`)
- `name` (`VARCHAR(255)`)
- `age` (`INTEGER`)
- `gender` (`VARCHAR(10)`)
- `ward_id` (`VARCHAR(50)`, Indexed)
- `bed_number` (`VARCHAR(50)`)
- `admission_date` (`TIMESTAMPTZ`)
- `status` (`VARCHAR(50)`, Indexed): `ADMITTED`, `PREPARING`, `READY_FOR_OT`, `IN_TRANSFER`, `IN_OT`, `IN_SURGERY`, `POST_OP`, `DISCHARGED`
- `primary_diagnosis` (`TEXT`)
- `active_surgery_id` (`VARCHAR(64)`)
- `created_at`, `updated_at` (`TIMESTAMPTZ`)

### 5. `patient_readiness`
*Pre-operative checklist and surgical consent verification.*
- `id` (`VARCHAR(64)`, Primary Key)
- `patient_id` (`VARCHAR(64)`, Unique, FK → `patients.id`, Indexed)
- `admission_completed` (`BOOLEAN`, Default `TRUE`)
- `consent_status` (`VARCHAR(50)`, Default `'PENDING'`): `PENDING`, `VERIFIED`, `MISSING`
- `documentation_completed` (`BOOLEAN`, Default `FALSE`)
- `reports_available` (`BOOLEAN`, Default `FALSE`)
- `doctor_confirmed` (`BOOLEAN`, Default `FALSE`)
- `preop_prep_completed` (`BOOLEAN`, Default `FALSE`)
- `completed_items_count` (`INTEGER`, Default `1`)
- `total_items_count` (`INTEGER`, Default `6`)
- `is_ready` (`BOOLEAN`, Default `FALSE`, Indexed)
- `notes` (`TEXT`)
- `updated_at` (`TIMESTAMPTZ`)

### 6. `surgeries`
*Surgical procedures, scheduling, tray assignments, and delay tracking.*
- `id` (`VARCHAR(64)`, Primary Key)
- `patient_id` (`VARCHAR(64)`, FK → `patients.id`, Indexed)
- `ot_id` (`VARCHAR(64)`, FK → `operating_theatres.id`, Indexed)
- `procedure_name` (`VARCHAR(255)`)
- `surgeon_name` (`VARCHAR(255)`)
- `anesthesiologist_name` (`VARCHAR(255)`)
- `required_pack_type` (`VARCHAR(100)`)
- `assigned_pack_id` (`VARCHAR(64)`)
- `scheduled_start_time` (`TIMESTAMPTZ`, Indexed)
- `expected_duration_minutes` (`INTEGER`, Default `90`)
- `actual_start_time`, `actual_end_time` (`TIMESTAMPTZ`)
- `actual_duration_minutes` (`INTEGER`)
- `priority` (`VARCHAR(50)`, Default `'ELECTIVE'`)
- `status` (`VARCHAR(50)`, Indexed): `SCHEDULED`, `READY`, `IN_PROGRESS`, `COMPLETED`, `DELAYED`, `CANCELLED`
- `delay_minutes` (`INTEGER`, Default `0`)
- `delay_reason` (`TEXT`)
- `risk_level` (`VARCHAR(20)`, Default `'LOW'`)
- `risk_reasons` (`JSONB`, Default `'[]'::jsonb`)
- `created_at`, `updated_at` (`TIMESTAMPTZ`)

### 7. `cssd_packs`
*Central Sterile Supply Department instrument sets, sterility, and QR tracking.*
- `id` (`VARCHAR(64)`, Primary Key)
- `pack_id` (`VARCHAR(64)`, Unique, Indexed): Barcode/QR code (e.g. `CSSD-021`)
- `pack_type` (`VARCHAR(100)`, Indexed): `Appendectomy Set`, `Laparotomy Set`, `Orthopedic Major`, etc.
- `sterilization_batch` (`VARCHAR(64)`)
- `sterilized_at` (`TIMESTAMPTZ`)
- `expires_at` (`TIMESTAMPTZ`, Indexed)
- `sterility_status` (`VARCHAR(50)`): `STERILIZED`, `UNSTERILIZED`, `EXPIRED`
- `current_status` (`VARCHAR(50)`, Indexed): `COLLECTED`, `STERILIZING`, `STERILIZED`, `STORED`, `AVAILABLE`, `ASSIGNED`, `IN_USE`, `RETURNED`, `REPROCESSING`, `EXPIRED`, `BLOCKED`
- `current_location` (`VARCHAR(255)`)
- `assigned_ot_id` (`VARCHAR(64)`, FK → `operating_theatres.id`)
- `assigned_surgery_id` (`VARCHAR(64)`, FK → `surgeries.id`)
- `assigned_patient_id` (`VARCHAR(64)`, FK → `patients.id`)
- `notes` (`TEXT`)
- `updated_at` (`TIMESTAMPTZ`)

### 8. `transfers`
*Patient transportation between inpatient wards and surgical suites.*
- `id` (`VARCHAR(64)`, Primary Key)
- `patient_id` (`VARCHAR(64)`, FK → `patients.id`, Indexed)
- `surgery_id` (`VARCHAR(64)`, FK → `surgeries.id`, Indexed)
- `from_ward` (`VARCHAR(50)`)
- `to_ot_id` (`VARCHAR(64)`, FK → `operating_theatres.id`)
- `to_ot_code` (`VARCHAR(50)`)
- `transfer_started_at` (`TIMESTAMPTZ`)
- `patient_arrived_at` (`TIMESTAMPTZ`)
- `duration_minutes` (`INTEGER`)
- `status` (`VARCHAR(50)`, Indexed): `IN_TRANSIT`, `COMPLETED`, `DELAYED`
- `created_at` (`TIMESTAMPTZ`)

### 9. `workflow_events`
*Immutable append-only event sourcing store.*
- `id` (`VARCHAR(64)`, Primary Key)
- `event_type` (`VARCHAR(100)`, Indexed): `PATIENT_ADMITTED`, `CONSENT_VERIFIED`, `CSSD_PACK_SCANNED`, `TRANSFER_STARTED`, `PATIENT_ARRIVED_OT`, `OT_STATE_CHANGED`, `SURGERY_STARTED`, `SURGERY_COMPLETED`, `TURNOVER_COMPLETED`, `ALERT_TRIGGERED`, `ALERT_RESOLVED`, etc.
- `entity_type` (`VARCHAR(50)`, Indexed)
- `entity_id` (`VARCHAR(64)`, Indexed)
- `department` (`VARCHAR(50)`)
- `timestamp` (`TIMESTAMPTZ`, Indexed)
- `actor_id` (`VARCHAR(64)`)
- `actor_name` (`VARCHAR(255)`)
- `metadata` (`JSONB`, Default `'{}'::jsonb`)
- `correlation_id` (`VARCHAR(64)`)
- `idempotency_key` (`VARCHAR(128)`, Unique, Indexed)

### 10. `alerts`
*Operational bottleneck and clinical readiness exception alerts.*
- `id` (`VARCHAR(64)`, Primary Key)
- `severity` (`VARCHAR(20)`, Indexed): `CRITICAL`, `WARNING`, `INFO`
- `title` (`VARCHAR(255)`)
- `description` (`TEXT`)
- `entity_type` (`VARCHAR(50)`)
- `entity_id` (`VARCHAR(64)`)
- `responsible_role` (`VARCHAR(50)`, FK → `roles.role_name`, Indexed)
- `recommended_action` (`TEXT`)
- `status` (`VARCHAR(50)`, Indexed): `OPEN`, `ACKNOWLEDGED`, `RESOLVED`
- `created_at` (`TIMESTAMPTZ`)
- `resolved_at` (`TIMESTAMPTZ`)
- `resolved_by` (`VARCHAR(255)`)

### 11. `audit_logs`
*Complete regulatory traceability and tamper-evident action history.*
- `id` (`VARCHAR(64)`, Primary Key)
- `timestamp` (`TIMESTAMPTZ`, Indexed)
- `actor_id` (`VARCHAR(64)`, Indexed)
- `actor_name` (`VARCHAR(255)`)
- `action` (`VARCHAR(100)`)
- `entity_type` (`VARCHAR(50)`, Indexed)
- `entity_id` (`VARCHAR(64)`, Indexed)
- `previous_state` (`JSONB`)
- `new_state` (`JSONB`)
- `ip_address` (`VARCHAR(64)`)

### 12. `ai_interactions`
*AI decision-support queries, context snapshots, generated recommendations, and confidence tracking.*
- `id` (`VARCHAR(64)`, Primary Key)
- `timestamp` (`TIMESTAMPTZ`, Indexed)
- `actor_id` (`VARCHAR(64)`)
- `query` (`TEXT`)
- `intent` (`VARCHAR(100)`, Indexed)
- `context_snapshot` (`JSONB`)
- `response_summary` (`TEXT`)
- `risk_level` (`VARCHAR(20)`)
- `root_cause` (`TEXT`)
- `evidence` (`JSONB`)
- `recommended_actions` (`JSONB`)
- `confidence` (`NUMERIC(4,3)`)
- `provider` (`VARCHAR(50)`)
- `model` (`VARCHAR(100)`)

---

## 3. Running Migrations

Migrations are stored in `backend/src/database/migrations/*.sql` and executed automatically on startup:

```bash
npm --prefix backend run dev
```
