import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { patientRepository } from '../src/repositories/patient.repository';
import { cssdRepository } from '../src/repositories/cssd.repository';
import { otRepository } from '../src/repositories/ot.repository';
import { transferRepository } from '../src/repositories/transfer.repository';
import { alertEngine } from '../src/alerts/alert-engine';
import { alertRepository } from '../src/repositories/alert.repository';
import { delayEngine } from '../src/analytics/delay-engine';
import { delayRiskEngine } from '../src/analytics/risk-engine';
import { aiOperationsService } from '../src/ai/ai-provider';
import { aiContextBuilder } from '../src/ai/ai-context';
import { isValidOTTransition, isValidCSSDTransition } from '../../shared/src/state-machines';

describe('SmartOT Command: Operational Workflow & Intelligence Engines', () => {
  beforeAll(async () => {
    await seedDatabase(true);
  });

  describe('1. Patient Readiness & Consent Logic', () => {
    it('calculates readiness score accurately and sets isReady only when 6/6 items complete', () => {
      const patientId = 'pat_1024';
      // Initially 5/6 and consent MISSING
      const readiness = patientRepository.getReadiness(patientId);
      expect(readiness).toBeDefined();
      expect(readiness?.isReady).toBe(false);
      expect(readiness?.consentStatus).toBe('MISSING');

      // Update consent to VERIFIED and complete remaining items
      const updated = patientRepository.updateReadiness(patientId, {
        consentStatus: 'VERIFIED',
        documentationCompleted: true,
        reportsAvailable: true,
        doctorConfirmed: true,
        preopPrepCompleted: true,
      });

      expect(updated.completedItemsCount).toBe(6);
      expect(updated.isReady).toBe(true);
      expect(updated.consentStatus).toBe('VERIFIED');
    });
  });

  describe('2. CSSD Expiry & QR Verification Engine', () => {
    it('verifies certified sterile set and blocks expired or unsterilized sets', () => {
      // Certified Set: CSSD-021
      const validRes = cssdRepository.verifyQR('CSSD-021', 'OT-03', 'Appendectomy Set');
      expect(validRes.valid).toBe(true);
      expect(validRes.status).toBe('VERIFIED');
      expect(validRes.pack).toBeDefined();

      // Expired Set: CSSD-099
      const expiredRes = cssdRepository.verifyQR('CSSD-099', 'OT-03', 'Appendectomy Set');
      expect(expiredRes.valid).toBe(false);
      expect(expiredRes.status).toBe('BLOCKED');
      expect(expiredRes.reasons.some((r) => r.includes('expired'))).toBe(true);

      // Unsterilized Set: CSSD-044
      const unsterileRes = cssdRepository.verifyQR('CSSD-044', 'OT-01');
      expect(unsterileRes.valid).toBe(false);
      expect(unsterileRes.status).toBe('BLOCKED');
    });

    it('enforces valid CSSD lifecycle transitions', () => {
      expect(isValidCSSDTransition('COLLECTED', 'STERILIZING')).toBe(true);
      expect(isValidCSSDTransition('STERILIZING', 'STERILIZED')).toBe(true);
      expect(isValidCSSDTransition('AVAILABLE', 'ASSIGNED')).toBe(true);
      expect(isValidCSSDTransition('IN_USE', 'STORED')).toBe(false); // Invalid direct transition
    });
  });

  describe('3. Operating Theatre State Machine', () => {
    it('validates state transitions along standard surgical progression', () => {
      expect(isValidOTTransition('SCHEDULED', 'PREPARING')).toBe(true);
      expect(isValidOTTransition('PREPARING', 'PATIENT_READY')).toBe(true);
      expect(isValidOTTransition('PATIENT_READY', 'PATIENT_TRANSFER')).toBe(true);
      expect(isValidOTTransition('PATIENT_TRANSFER', 'PATIENT_ARRIVED')).toBe(true);
      expect(isValidOTTransition('PATIENT_ARRIVED', 'OT_READY')).toBe(true);
      expect(isValidOTTransition('OT_READY', 'SURGERY_STARTED')).toBe(true);
      expect(isValidOTTransition('SURGERY_STARTED', 'SURGERY_COMPLETED')).toBe(true);
      expect(isValidOTTransition('SURGERY_COMPLETED', 'TURNOVER')).toBe(true);
      expect(isValidOTTransition('TURNOVER', 'AVAILABLE')).toBe(true);

      // Invalid transitions
      expect(isValidOTTransition('SCHEDULED', 'SURGERY_COMPLETED')).toBe(false);
      expect(isValidOTTransition('AVAILABLE', 'SURGERY_STARTED')).toBe(false);
    });
  });

  describe('4. Patient Transfer Timing & Duration', () => {
    it('tracks transfer timestamps and calculates duration in minutes', () => {
      const transfer = transferRepository.startTransfer({
        patientId: 'pat_1003',
        surgeryId: 'surg_03',
        fromWard: 'Ward 5C',
        toOtId: 'ot_02',
        toOtCode: 'OT-02',
      });

      expect(transfer.id).toBeDefined();
      expect(transfer.status).toBe('IN_TRANSIT');

      const completed = transferRepository.completeArrival(transfer.id);
      expect(completed?.status).toBe('COMPLETED');
      expect(completed?.durationMinutes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Alert Engine & Delay Detection', () => {
    it('evaluates operational rules and detects turnover overruns', async () => {
      await alertEngine.evaluateAllRules();
      const openAlerts = alertRepository.findOpenAlerts();
      expect(openAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('6. Explainable Root Cause & Delay Risk Engine', () => {
    it('attributes delay factors and computes cascading schedule risk', () => {
      const risk = delayRiskEngine.assessSurgeryRisk('surg_1024');
      expect(risk.riskLevel).toBeDefined();
      expect(risk.reasons.length).toBeGreaterThan(0);

      const rootCause = delayEngine.analyzeSurgeryRootCause('surg_1024');
      expect(rootCause.isDelayed).toBe(true);
      expect(rootCause.primaryContributingFactor).toBeDefined();
    });
  });

  describe('7. AI Operations Consultant', () => {
    it('constructs structured context and returns explainable operational advisory format', async () => {
      const context = aiContextBuilder.buildContext();
      expect(context.kpis).toBeDefined();
      expect(context.otStatuses.length).toBe(4);

      const response = await aiOperationsService.ask('Why is OT-03 delayed?', context);
      expect(response.summary).toContain('OT-03');
      expect(response.likelyContributors.length).toBeGreaterThan(0);
      expect(response.evidence.length).toBeGreaterThan(0);
      expect(response.recommendedActions.length).toBeGreaterThan(0);
      expect(response.uncertaintyLimitations).toBeDefined();
    });
  });
});
