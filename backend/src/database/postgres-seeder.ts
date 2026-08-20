import { postgresClient } from './postgres';
import { generateSeedData } from './seed-data';

export async function seedPostgresDatabase(): Promise<void> {
  if (!postgresClient.isConnected()) return;

  const seed = await generateSeedData();

  try {
    // 1. Roles
    const roles = [
      { name: 'ADMINISTRATOR', desc: 'Full Operational & System Access' },
      { name: 'OT_MANAGER', desc: 'Surgical Suite & OT Operations Management' },
      { name: 'CSSD_STAFF', desc: 'Central Sterile Supply & Instrument Processing' },
      { name: 'WARD_STAFF', desc: 'Pre-Op Inpatient Ward & Patient Readiness' },
    ];
    for (const r of roles) {
      await postgresClient.query(
        `INSERT INTO roles (role_name, description, permissions)
         VALUES ($1, $2, '[]'::jsonb)
         ON CONFLICT (role_name) DO NOTHING`,
        [r.name, r.desc]
      );
    }

    // 2. Users
    for (const u of seed.users) {
      await postgresClient.query(
        `INSERT INTO users (id, email, password_hash, name, role, department, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department`,
        [u.id, u.email, 'hashed_password_demo', u.name, u.role, u.department, u.createdAt]
      );
    }

    // 3. Operating Theatres
    for (const ot of seed.operating_theatres) {
      await postgresClient.query(
        `INSERT INTO operating_theatres (id, code, name, specialty, current_status, active_surgery_id, turnover_started_at, expected_turnover_minutes, current_delay_minutes, risk_level, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE
         SET current_status = EXCLUDED.current_status, active_surgery_id = EXCLUDED.active_surgery_id, current_delay_minutes = EXCLUDED.current_delay_minutes, risk_level = EXCLUDED.risk_level, last_updated = EXCLUDED.last_updated`,
        [
          ot.id,
          ot.code,
          ot.name,
          ot.specialty,
          ot.currentStatus,
          ot.activeSurgeryId || null,
          ot.turnoverStartedAt || null,
          ot.expectedTurnoverMinutes,
          ot.currentDelayMinutes,
          ot.riskLevel,
          ot.lastUpdated,
        ]
      );
    }

    // 4. Patients
    for (const p of seed.patients) {
      await postgresClient.query(
        `INSERT INTO patients (id, mrn, name, age, gender, ward_id, bed_number, admission_date, status, primary_diagnosis, active_surgery_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status, active_surgery_id = EXCLUDED.active_surgery_id`,
        [
          p.id,
          p.mrn,
          p.name,
          p.age,
          p.gender,
          p.wardId,
          p.bedNumber,
          p.admissionDate,
          p.status,
          p.primaryDiagnosis,
          p.activeSurgeryId || null,
        ]
      );
    }

    // 5. Patient Readiness
    for (const pr of seed.patient_readiness) {
      await postgresClient.query(
        `INSERT INTO patient_readiness (id, patient_id, admission_completed, consent_status, documentation_completed, reports_available, doctor_confirmed, preop_prep_completed, completed_items_count, total_items_count, is_ready, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE
         SET consent_status = EXCLUDED.consent_status, completed_items_count = EXCLUDED.completed_items_count, is_ready = EXCLUDED.is_ready, updated_at = EXCLUDED.updated_at`,
        [
          pr.id,
          pr.patientId,
          pr.admissionCompleted,
          pr.consentStatus,
          pr.documentationCompleted,
          pr.reportsAvailable,
          pr.doctorConfirmed,
          pr.preopPrepCompleted,
          pr.completedItemsCount,
          pr.totalItemsCount,
          pr.isReady,
          pr.notes || null,
          pr.updatedAt,
        ]
      );
    }

    // 6. Surgeries
    for (const s of seed.surgeries) {
      await postgresClient.query(
        `INSERT INTO surgeries (id, patient_id, ot_id, procedure_name, surgeon_name, anesthesiologist_name, required_pack_type, assigned_pack_id, scheduled_start_time, expected_duration_minutes, actual_start_time, actual_end_time, actual_duration_minutes, priority, status, delay_minutes, delay_reason, risk_level, risk_reasons)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb)
         ON CONFLICT (id) DO UPDATE
         SET assigned_pack_id = EXCLUDED.assigned_pack_id, status = EXCLUDED.status, delay_minutes = EXCLUDED.delay_minutes, actual_start_time = EXCLUDED.actual_start_time, actual_end_time = EXCLUDED.actual_end_time`,
        [
          s.id,
          s.patientId,
          s.otId,
          s.procedureName,
          s.surgeonName,
          s.anesthesiologistName,
          s.requiredPackType,
          s.assignedPackId || null,
          s.scheduledStartTime,
          s.expectedDurationMinutes,
          s.actualStartTime || null,
          s.actualEndTime || null,
          s.actualDurationMinutes || null,
          s.priority || 'ELECTIVE',
          s.status,
          s.delayMinutes,
          s.delayReason || null,
          s.riskLevel,
          JSON.stringify(s.riskReasons || []),
        ]
      );
    }

    // 7. CSSD Packs
    for (const pack of seed.cssd_packs) {
      await postgresClient.query(
        `INSERT INTO cssd_packs (id, pack_id, pack_type, sterilization_batch, sterilized_at, expires_at, sterility_status, current_status, current_location, assigned_ot_id, assigned_surgery_id, assigned_patient_id, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE
         SET current_status = EXCLUDED.current_status, assigned_ot_id = EXCLUDED.assigned_ot_id, assigned_surgery_id = EXCLUDED.assigned_surgery_id, assigned_patient_id = EXCLUDED.assigned_patient_id, updated_at = EXCLUDED.updated_at`,
        [
          pack.id,
          pack.packId,
          pack.packType,
          pack.sterilizationBatch,
          pack.sterilizedAt,
          pack.expiresAt,
          pack.sterilityStatus,
          pack.currentStatus,
          pack.currentLocation,
          pack.assignedOtId || null,
          pack.assignedSurgeryId || null,
          pack.assignedPatientId || null,
          pack.notes || null,
          pack.updatedAt,
        ]
      );
    }

    // 8. Transfers
    for (const trf of seed.transfers) {
      await postgresClient.query(
        `INSERT INTO transfers (id, patient_id, surgery_id, from_ward, to_ot_id, to_ot_code, transfer_started_at, patient_arrived_at, duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET patient_arrived_at = EXCLUDED.patient_arrived_at, status = EXCLUDED.status, duration_minutes = EXCLUDED.duration_minutes`,
        [
          trf.id,
          trf.patientId,
          trf.surgeryId,
          trf.fromWard,
          trf.toOtId,
          trf.toOtCode || null,
          trf.transferStartedAt,
          trf.patientArrivedAt || null,
          trf.durationMinutes || null,
          trf.status,
        ]
      );
    }

    // 9. Workflow Events
    for (const evt of seed.workflow_events) {
      await postgresClient.query(
        `INSERT INTO workflow_events (id, event_type, entity_type, entity_id, department, timestamp, actor_id, actor_name, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          evt.id,
          evt.eventType,
          evt.entityType,
          evt.entityId,
          evt.department,
          evt.timestamp,
          evt.actorId,
          evt.actorName,
          JSON.stringify(evt.metadata || {}),
          evt.idempotencyKey || null,
        ]
      );
    }

    // 10. Alerts
    for (const alt of seed.alerts) {
      await postgresClient.query(
        `INSERT INTO alerts (id, severity, title, description, entity_type, entity_id, responsible_role, recommended_action, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status`,
        [
          alt.id,
          alt.severity,
          alt.title,
          alt.description,
          alt.entityType,
          alt.entityId,
          alt.responsibleRole,
          alt.recommendedAction,
          alt.status,
          alt.createdAt,
        ]
      );
    }

    console.log('✓ PostgreSQL tables populated with canonical operational seed data');
  } catch (err: any) {
    console.warn('[PostgreSQL Seeder Warning]', err.message);
  }
}
