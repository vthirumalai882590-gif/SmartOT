import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase } from '../src/database/seed';
import { patientRepository } from '../src/repositories/patient.repository';
import { otRepository } from '../src/repositories/ot.repository';
import { cssdRepository } from '../src/repositories/cssd.repository';
import { transferRepository } from '../src/repositories/transfer.repository';
import { eventRepository } from '../src/repositories/event.repository';
import { alertRepository } from '../src/repositories/alert.repository';
import { patientStateService } from '../src/services/patient-state.service';
import { otStateService } from '../src/services/ot-state.service';
import { workflowTransactionService } from '../src/services/workflow-transaction.service';
import { correlationEngine } from '../src/events/correlation-engine';
import { alertEngine } from '../src/alerts/alert-engine';
import { aiContextBuilder } from '../src/ai/ai-context';
import { db } from '../src/database/db';

describe('SmartOT — Full End-to-End Domain Integration Test Suite', () => {
  beforeEach(async () => {
    await seedDatabase(true);
  });

  // 1. CANONICAL OT ID NORMALIZATION
  describe('Canonical OT ID Normalization', () => {
    it('resolves display code "OT-03" to canonical otId "ot_03"', () => {
      const canonical = otRepository.resolveOTId('OT-03');
      expect(canonical).toBe('ot_03');
    });

    it('resolves direct canonical ID "ot_03" to "ot_03"', () => {
      const canonical = otRepository.resolveOTId('ot_03');
      expect(canonical).toBe('ot_03');
    });

    it('findOTByCode matches uppercase and lowercase codes', () => {
      const otUpper = otRepository.findOTByCode('OT-01');
      const otLower = otRepository.findOTByCode('ot-01');
      expect(otUpper?.id).toBe('ot_01');
      expect(otLower?.id).toBe('ot_01');
    });
  });

  // 2. CENTRALIZED PATIENT STATE SERVICE
  describe('Patient State Service & Validations', () => {
    it('executes valid patient transition ADMITTED → PREPARING', async () => {
      const patient = patientRepository.findAll().find((p) => p.status === 'ADMITTED') || patientRepository.findAll()[0];
      // Force status to ADMITTED for clean test
      patientRepository.forceUpdateStatus(patient.id, 'ADMITTED');

      const result = await patientStateService.transitionPatientStatus(patient.id, 'PREPARING', {
        actorId: 'usr_test',
        actorName: 'Test Staff',
      });

      expect(result.success).toBe(true);
      expect(result.patient?.status).toBe('PREPARING');
    });

    it('rejects invalid patient jump ADMITTED → IN_SURGERY', async () => {
      const patient = patientRepository.findAll()[0];
      patientRepository.forceUpdateStatus(patient.id, 'ADMITTED');

      const result = await patientStateService.transitionPatientStatus(patient.id, 'IN_SURGERY', {
        actorId: 'usr_test',
        actorName: 'Test Staff',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid patient state transition');
    });
  });

  // 3. 15-STEP QR VERIFICATION CHAIN & NEGATIVE TESTS
  describe('15-Step QR Verification Chain', () => {
    it('verifies valid pack for matching surgery, patient, and OT', () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0];
      const patient = patientRepository.findById(surg.patientId);

      const res = cssdRepository.verifyQR('CSSD-021', 'OT-03', 'Appendectomy Set', surg.id, surg.patientId, surg.otId);

      expect(res.valid).toBe(true);
      expect(res.status).toBe('VERIFIED');
      expect(res.pack?.packId).toBe('CSSD-021');
    });

    it('rejects scan when surgery belongs to patient A but scanned for patient B', () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0];

      const res = cssdRepository.verifyQR('CSSD-021', 'OT-03', 'Appendectomy Set', surg.id, 'pat_wrong_9999', surg.otId);

      expect(res.valid).toBe(false);
      expect(res.status).toBe('BLOCKED');
      expect(res.reasons.some((r) => r.includes('belongs to patient'))).toBe(true);
    });

    it('rejects scan when surgery is scheduled for OT-01 but scanned for OT-04', () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0]; // ot_01 or ot_03

      const res = cssdRepository.verifyQR('CSSD-021', 'OT-04', 'Appendectomy Set', surg.id, surg.patientId, 'ot_04');

      expect(res.valid).toBe(false);
      expect(res.status).toBe('BLOCKED');
      expect(res.reasons.some((r) => r.includes('scheduled for'))).toBe(true);
    });

    it('rejects scan when required pack type mismatches', () => {
      const res = cssdRepository.verifyQR('CSSD-021', 'OT-03', 'Orthopedic Arthroplasty Set');

      expect(res.valid).toBe(false);
      expect(res.status).toBe('BLOCKED');
      expect(res.reasons.some((r) => r.includes('Mismatched tray type'))).toBe(true);
    });
  });

  // 4. TRANSACTIONAL WORKFLOWS
  describe('Transactional Workflows', () => {
    it('executes atomic CSSD pack assignment with 4-entity relationships', async () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0];

      const result = await workflowTransactionService.executeCSSDPackAssignment({
        packId: 'CSSD-021',
        surgeryId: surg.id,
        patientId: surg.patientId,
        otId: surg.otId,
        targetOT: surg.otCode,
        requiredPackType: surg.requiredPackType,
        actorId: 'usr_test',
        actorName: 'CSSD Tech',
      });

      expect(result.success).toBe(true);
      expect(result.pack?.assignedSurgeryId).toBe(surg.id);
      expect(result.pack?.assignedPatientId).toBe(surg.patientId);
      expect(result.pack?.assignedOtId).toBe(surg.otId);

      // Verify event was emitted and captured in repository
      const events = eventRepository.findAll();
      const assignEvt = events.find((e) => e.eventType === 'CSSD_PACK_ASSIGNED' && e.entityId === 'CSSD-021');
      expect(assignEvt).toBeDefined();
      expect(assignEvt?.metadata.surgeryId).toBe(surg.id);
      expect(assignEvt?.metadata.patientId).toBe(surg.patientId);
    });

    it('executes atomic patient transfer and arrival', async () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0];

      // Prepare patient in READY_FOR_OT status and OT in PATIENT_READY status
      patientRepository.forceUpdateStatus(surg.patientId, 'READY_FOR_OT');
      otRepository.updateOTStatus(surg.otId, 'PATIENT_READY', undefined, true);

      // Start Transfer
      const trfRes = await workflowTransactionService.executePatientTransfer({
        patientId: surg.patientId,
        surgeryId: surg.id,
        fromWard: 'Ward 4B',
        toOtId: surg.otId,
        actorId: 'usr_ward',
        actorName: 'Ward Nurse',
      });

      expect(trfRes.success).toBe(true);
      expect(trfRes.transfer?.status).toBe('IN_TRANSIT');

      const patInTransfer = patientRepository.findById(surg.patientId);
      expect(patInTransfer?.status).toBe('IN_TRANSFER');

      // Patient Arrival
      const arrRes = await workflowTransactionService.executePatientArrival({
        transferId: trfRes.transfer?.id,
        patientId: surg.patientId,
        otId: surg.otId,
        actorId: 'usr_ot',
        actorName: 'OT Nurse',
      });

      expect(arrRes.success).toBe(true);
      const patInOT = patientRepository.findById(surg.patientId);
      expect(patInOT?.status).toBe('IN_OT');
    });
  });

  // 5. TIMELINE CORRELATION RECONSTRUCTION
  describe('Full Case Timeline Correlation', () => {
    it('reconstructs complete case timeline by explicit surgeryId', async () => {
      const surgeries = otRepository.findAllSurgeries();
      const surg = surgeries[0];

      const timeline = correlationEngine.correlateSurgeryTimeline(surg.id);

      expect(timeline).not.toBeNull();
      expect(timeline?.surgeryId).toBe(surg.id);
      expect(timeline?.patientId).toBe(surg.patientId);
      expect(timeline?.stages.readiness).toBeDefined();
    });
  });

  // 6. ALERT IDEMPOTENCY
  describe('Alert Engine Idempotency', () => {
    it('does not create duplicate alerts on repeated rule evaluations', async () => {
      await alertEngine.evaluateAllRules();
      const countAfterFirst = alertRepository.findOpenAlerts().length;

      await alertEngine.evaluateAllRules();
      await alertEngine.evaluateAllRules();

      const countAfterRepeated = alertRepository.findOpenAlerts().length;
      expect(countAfterRepeated).toBe(countAfterFirst);
    });
  });

  // 7. PRIVACY-PRESERVING AI CONTEXT
  describe('AI Context Privacy', () => {
    it('builds operational context without sending patient names or PII', () => {
      const context = aiContextBuilder.buildContext();

      expect(context.hospitalName).toBeDefined();
      expect(context.operationalDisclaimer).toContain('OPERATIONAL_DECISION_SUPPORT_ONLY');

      // Verify otStatuses uses currentPatientId, not patient names
      for (const ot of context.otStatuses) {
        if (ot.currentPatientId) {
          expect(ot.currentPatientId.startsWith('pat_')).toBe(true);
        }
      }
    });
  });
});
