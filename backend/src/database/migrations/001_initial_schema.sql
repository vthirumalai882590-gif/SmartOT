-- ============================================================================
-- SmartOT Command: PostgreSQL Relational Database Schema
-- Version: 1.0.0
-- ============================================================================

-- 1. Roles Definition
CREATE TABLE IF NOT EXISTS roles (
  role_name VARCHAR(50) PRIMARY KEY,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL REFERENCES roles(role_name) ON UPDATE CASCADE,
  department VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Operating Theatres Table
CREATE TABLE IF NOT EXISTS operating_theatres (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  current_status VARCHAR(50) NOT NULL,
  active_surgery_id VARCHAR(64),
  turnover_started_at TIMESTAMPTZ,
  expected_turnover_minutes INTEGER NOT NULL DEFAULT 25,
  current_delay_minutes INTEGER NOT NULL DEFAULT 0,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_code ON operating_theatres(code);
CREATE INDEX IF NOT EXISTS idx_ot_status ON operating_theatres(current_status);

-- 4. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY,
  mrn VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(10) NOT NULL,
  ward_id VARCHAR(50) NOT NULL,
  bed_number VARCHAR(50) NOT NULL,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'ADMITTED',
  primary_diagnosis TEXT NOT NULL,
  active_surgery_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_ward ON patients(ward_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- 5. Patient Readiness Table
CREATE TABLE IF NOT EXISTS patient_readiness (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_completed BOOLEAN NOT NULL DEFAULT TRUE,
  consent_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  documentation_completed BOOLEAN NOT NULL DEFAULT FALSE,
  reports_available BOOLEAN NOT NULL DEFAULT FALSE,
  doctor_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  preop_prep_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_items_count INTEGER NOT NULL DEFAULT 1,
  total_items_count INTEGER NOT NULL DEFAULT 6,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readiness_patient ON patient_readiness(patient_id);
CREATE INDEX IF NOT EXISTS idx_readiness_is_ready ON patient_readiness(is_ready);

-- 6. Surgeries Table
CREATE TABLE IF NOT EXISTS surgeries (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  ot_id VARCHAR(64) NOT NULL REFERENCES operating_theatres(id) ON DELETE RESTRICT,
  procedure_name VARCHAR(255) NOT NULL,
  surgeon_name VARCHAR(255) NOT NULL,
  anesthesiologist_name VARCHAR(255) NOT NULL,
  required_pack_type VARCHAR(100) NOT NULL,
  assigned_pack_id VARCHAR(64),
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  expected_duration_minutes INTEGER NOT NULL DEFAULT 90,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  priority VARCHAR(50) NOT NULL DEFAULT 'ELECTIVE',
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  delay_reason TEXT,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
  risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_ot ON surgeries(ot_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_surgeries_schedule ON surgeries(scheduled_start_time);

-- 7. CSSD Sterile Packs Table
CREATE TABLE IF NOT EXISTS cssd_packs (
  id VARCHAR(64) PRIMARY KEY,
  pack_id VARCHAR(64) UNIQUE NOT NULL,
  pack_type VARCHAR(100) NOT NULL,
  sterilization_batch VARCHAR(64) NOT NULL,
  sterilized_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sterility_status VARCHAR(50) NOT NULL DEFAULT 'STERILIZED',
  current_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  current_location VARCHAR(255) NOT NULL DEFAULT 'CSSD Main Sterile Bay',
  assigned_ot_id VARCHAR(64) REFERENCES operating_theatres(id) ON DELETE SET NULL,
  assigned_surgery_id VARCHAR(64) REFERENCES surgeries(id) ON DELETE SET NULL,
  assigned_patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cssd_pack_id ON cssd_packs(pack_id);
CREATE INDEX IF NOT EXISTS idx_cssd_type ON cssd_packs(pack_type);
CREATE INDEX IF NOT EXISTS idx_cssd_status ON cssd_packs(current_status);
CREATE INDEX IF NOT EXISTS idx_cssd_expires ON cssd_packs(expires_at);

-- 8. Patient Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgery_id VARCHAR(64) NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
  from_ward VARCHAR(50) NOT NULL,
  to_ot_id VARCHAR(64) NOT NULL REFERENCES operating_theatres(id) ON DELETE CASCADE,
  to_ot_code VARCHAR(50),
  transfer_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_arrived_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'IN_TRANSIT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_patient ON transfers(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfers_surgery ON transfers(surgery_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);

-- 9. Workflow Events Table (Immutable Event Sourcing)
CREATE TABLE IF NOT EXISTS workflow_events (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  department VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id VARCHAR(64),
  idempotency_key VARCHAR(128) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_events_type ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_entity ON workflow_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON workflow_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_idempotency ON workflow_events(idempotency_key);

-- 10. Operational Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY,
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  responsible_role VARCHAR(50) NOT NULL REFERENCES roles(role_name) ON UPDATE CASCADE,
  recommended_action TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_role ON alerts(responsible_role);

-- 11. Audit Logs Table (Full Traceability)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  ip_address VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 12. AI Consultant Interactions Table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id VARCHAR(64) NOT NULL,
  query TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  context_snapshot JSONB NOT NULL,
  response_summary TEXT NOT NULL,
  risk_level VARCHAR(20),
  root_cause TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4,3) DEFAULT 0.950,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_timestamp ON ai_interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_intent ON ai_interactions(intent);
