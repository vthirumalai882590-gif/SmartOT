import { describe, it, expect, beforeAll } from 'vitest';
import { cssdRepository } from '../src/repositories/cssd.repository';
import { isValidCSSDTransition } from '../shared/src/state-machines';
import { db } from '../src/database/db';

describe('CSSD Instrument Lifecycle & Sterilization Management Tests', () => {
  beforeAll(() => {
    // Ensure test db has initial arrays
    const data = db.getData();
    data.cssd_items = data.cssd_items || [];
    data.cssd_sterilization_jobs = data.cssd_sterilization_jobs || [];
    data.cssd_cycle_profiles = data.cssd_cycle_profiles || [];
    data.cssd_releases = data.cssd_releases || [];
    data.cssd_item_events = data.cssd_item_events || [];
  });

  describe('1. QR Scanner Verification', () => {
    it('should verify a valid sterile item QR code', () => {
      const result = cssdRepository.verifyQR('SET-021');
      expect(result.valid).toBe(true);
      expect(result.status).toBe('VERIFIED');
      expect(result.packId).toBe('SET-021');
    });

    it('should reject an unknown QR code with "Instrument Not Found"', () => {
      const result = cssdRepository.verifyQR('UNKNOWN-QR-999');
      expect(result.valid).toBe(false);
      expect(result.status).toBe('BLOCKED');
      expect(result.message).toContain('Instrument Not Found');
    });

    it('should block scanning an item that is currently processing in autoclave', () => {
      // Find or set an item to PROCESSING
      const item = cssdRepository.findItemByQR('TRAY-005');
      if (item) {
        const result = cssdRepository.verifyQR('TRAY-005');
        expect(result.valid).toBe(false);
        expect(result.status).toBe('BLOCKED');
        expect(result.reasons[0]).toContain('currently undergoing active sterilization');
      }
    });
  });

  describe('2. Master Inventory & Item Registration', () => {
    it('should create and retrieve a new master instrument item', () => {
      const newItem = cssdRepository.createItem({
        name: 'Test Endoscopic Clipper',
        qrCode: 'TEST-CLIP-01',
        category: 'Endoscopy Equipment',
        quantity: 1,
        location: 'CSSD Store Bay A',
      });

      expect(newItem.id).toBeDefined();
      expect(newItem.qrCode).toBe('TEST-CLIP-01');

      const retrieved = cssdRepository.findItemByQR('TEST-CLIP-01');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Endoscopic Clipper');
    });
  });

  describe('3. Sterilization Job Creation & Pre-Send Validation', () => {
    it('should create a sterilization job for an eligible item', () => {
      // Create fresh test item
      const item = cssdRepository.createItem({
        name: 'Test Laparoscopic Scissors',
        qrCode: 'TEST-SCIS-01',
        category: 'Surgical Instrument',
        currentStatus: 'RETURNED_TO_CSSD',
      });

      const result = cssdRepository.createSterilizationJob(
        {
          instrumentId: item.id,
          sourceOT: 'OT-02',
          notes: 'Test request creation',
        },
        'Nurse Practitioner'
      );

      expect(result.success).toBe(true);
      expect(result.job).toBeDefined();
      expect(result.job?.status).toBe('QUEUED');
      expect(result.job?.submittedBy).toBe('Nurse Practitioner');

      const updatedItem = cssdRepository.findItemById(item.id);
      expect(updatedItem?.currentStatus).toBe('QUEUED');
    });

    it('should reject creating duplicate sterilization jobs for an item already queued/processing', () => {
      const item = cssdRepository.findItemByQR('TEST-SCIS-01');
      expect(item).toBeDefined();

      const duplicateResult = cssdRepository.createSterilizationJob(
        {
          instrumentId: item!.id,
          sourceOT: 'OT-02',
        },
        'Duplicate Requester'
      );

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('already queued in CSSD');
    });
  });

  describe('4. Sterilization Cycle Lifecycle & Timing', () => {
    it('should start processing job and calculate expected completion time', () => {
      const job = cssdRepository.findAllJobs().find((j) => j.status === 'QUEUED');
      expect(job).toBeDefined();

      const startResult = cssdRepository.startJobProcessing(job!.id, 'Technician Alex', 'Steam Autoclave Standard (134°C)');
      expect(startResult.success).toBe(true);
      expect(startResult.job?.status).toBe('PROCESSING');
      expect(startResult.job?.processingStartedAt).toBeDefined();
      expect(startResult.job?.expectedCompletionAt).toBeDefined();

      const item = cssdRepository.findItemById(job!.instrumentId);
      expect(item?.currentStatus).toBe('PROCESSING');
    });

    it('should complete processing job and transition to RELEASE_PENDING', () => {
      const job = cssdRepository.findAllJobs().find((j) => j.status === 'PROCESSING');
      expect(job).toBeDefined();

      const completeResult = cssdRepository.completeJobProcessing(job!.id, 'Technician Alex');
      expect(completeResult.success).toBe(true);
      expect(completeResult.job?.status).toBe('RELEASE_PENDING');
      expect(completeResult.job?.processingCompletedAt).toBeDefined();
    });
  });

  describe('5. Release Check (Release vs Reject vs Quarantine)', () => {
    it('should release item upon successful verification and return to STERILE inventory', () => {
      const job = cssdRepository.findAllJobs().find((j) => j.status === 'RELEASE_PENDING');
      expect(job).toBeDefined();

      const releaseResult = cssdRepository.releaseJob(
        job!.id,
        {
          cycleCompleted: true,
          packagingAcceptable: true,
          indicatorVerified: true,
          releaseDecision: 'RELEASED',
          notes: 'Passed all 3 quality checks',
        },
        'QA Inspector Sarah'
      );

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.job?.status).toBe('RELEASED');
      expect(releaseResult.job?.releasedBy).toBe('QA Inspector Sarah');

      const item = cssdRepository.findItemById(job!.instrumentId);
      expect(item?.currentStatus).toBe('STERILE');
      expect(item?.releasedBy).toBe('QA Inspector Sarah');
    });

    it('should NOT return rejected item to sterile inventory', () => {
      // Create a item and job to test rejection
      const item = cssdRepository.createItem({
        name: 'Faulty Tray Set',
        qrCode: 'FAULTY-01',
        currentStatus: 'RETURNED_TO_CSSD',
      });

      const jobResult = cssdRepository.createSterilizationJob({ instrumentId: item.id }, 'Tester');
      cssdRepository.startJobProcessing(jobResult.job!.id, 'Tester');
      cssdRepository.completeJobProcessing(jobResult.job!.id, 'Tester');

      const rejectResult = cssdRepository.releaseJob(
        jobResult.job!.id,
        {
          cycleCompleted: false,
          packagingAcceptable: false,
          indicatorVerified: false,
          releaseDecision: 'REJECTED',
          notes: 'Chemical indicator did not change color',
        },
        'QA Inspector Sarah'
      );

      expect(rejectResult.success).toBe(true);
      expect(rejectResult.job?.status).toBe('REJECTED');

      const updatedItem = cssdRepository.findItemById(item.id);
      expect(updatedItem?.currentStatus).toBe('REJECTED');
      expect(updatedItem?.currentStatus).not.toBe('STERILE');
    });
  });

  describe('6. State Machine Validation', () => {
    it('should allow valid transitions according to workflow rules', () => {
      expect(isValidCSSDTransition('STERILE', 'ASSIGNED')).toBe(true);
      expect(isValidCSSDTransition('ASSIGNED', 'IN_USE')).toBe(true);
      expect(isValidCSSDTransition('IN_USE', 'RETURNED_TO_CSSD')).toBe(true);
      expect(isValidCSSDTransition('RETURNED_TO_CSSD', 'QUEUED')).toBe(true);
      expect(isValidCSSDTransition('QUEUED', 'PROCESSING')).toBe(true);
      expect(isValidCSSDTransition('PROCESSING', 'COMPLETED')).toBe(true);
      expect(isValidCSSDTransition('RELEASE_PENDING', 'RELEASED')).toBe(true);
    });
  });

  describe('7. Metrics Computation', () => {
    it('should return correct live CSSD operational metrics', () => {
      const metrics = cssdRepository.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.sterileItemsAvailable).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTimeMinutes).toBeGreaterThan(0);
    });
  });
});
