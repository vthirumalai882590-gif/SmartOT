import { Response } from 'express';
import { cssdRepository } from '../repositories/cssd.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CSSDPackStatus } from '../../../shared/src/types';

const ALLOWED_CSSD_ROLES = ['CSSD_STAFF', 'CSSD_SUPERVISOR', 'CSSD_TECH', 'ADMIN', 'SUPER_ADMIN'];

function checkCSSDPermissions(actor: any, res: Response): boolean {
  if (actor?.role && !ALLOWED_CSSD_ROLES.includes(actor.role.toUpperCase())) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: `Role "${actor.role}" is not authorized to perform sterilization processing operations. CSSD staff permission required.`,
    });
    return false;
  }
  return true;
}

export class CSSDController {
  // ─── ITEMS & INVENTORY ───────────────────────────────────────────────────
  public async getItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    const items = cssdRepository.findAllItems();
    res.json({ success: true, data: items });
  }

  public async getItemById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const item = cssdRepository.findItemById(id) || cssdRepository.findItemByQR(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'ITEM_NOT_FOUND', message: `Instrument item "${id}" not found` });
      return;
    }
    const events = cssdRepository.getItemEvents(item.id);
    res.json({ success: true, data: { ...item, events } });
  }

  public async getItemHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const events = cssdRepository.getItemEvents(id);
    res.json({ success: true, data: events });
  }

  public async getItemByQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    const qrCode = (req.params.qrCode || req.params.id || '').toString();
    const verification = cssdRepository.verifyQR(qrCode);
    const item = cssdRepository.findItemByQR(qrCode) || cssdRepository.findItemById(qrCode);
    const events = item ? cssdRepository.getItemEvents(item.id) : [];

    res.json({
      success: true,
      data: {
        verification,
        item: item || verification.pack,
        events,
      },
    });
  }

  public async createItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    const newItem = cssdRepository.createItem(req.body);

    await eventEngine.emitEvent({
      eventType: 'CSSD_ITEM_CREATED',
      entityType: 'CSSD_PACK',
      entityId: newItem.id,
      department: 'CSSD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: { qrCode: newItem.qrCode, name: newItem.name, category: newItem.category },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'CSSD_ITEM_REGISTERED',
      entityType: 'CSSD_ITEM',
      entityId: newItem.id,
      newState: newItem,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: newItem });
  }

  // ─── STERILIZATION JOBS & QUEUE ──────────────────────────────────────────
  public async getSterilizationJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const jobs = cssdRepository.findAllJobs();
    res.json({ success: true, data: jobs });
  }

  public async getSterilizationJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const job = cssdRepository.findJobById(id);
    if (!job) {
      res.status(404).json({ success: false, error: 'JOB_NOT_FOUND', message: `Sterilization job "${id}" not found` });
      return;
    }
    const events = cssdRepository.getItemEvents(job.id);
    res.json({ success: true, data: { ...job, events } });
  }

  public async createSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    const actorName = (actor as any).name || actor.email || 'CSSD Staff';

    const result = cssdRepository.createSterilizationJob(req.body, actorName);

    if (!result.success || !result.job) {
      res.status(400).json({
        success: false,
        error: 'CANNOT_CREATE_STERILIZATION_REQUEST',
        message: result.error || 'Failed to create sterilization request.',
      });
      return;
    }

    await eventEngine.emitEvent({
      eventType: 'STERILIZATION_JOB_CREATED',
      entityType: 'CSSD_PACK',
      entityId: result.job.instrumentId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName,
      metadata: {
        jobId: result.job.jobId,
        qrCode: result.job.qrCode,
        instrumentName: result.job.instrumentName,
        sourceOT: result.job.sourceOT,
        surgeryId: result.job.associatedSurgeryId,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName,
      action: 'STERILIZATION_JOB_CREATED',
      entityType: 'STERILIZATION_JOB',
      entityId: result.job.jobId,
      newState: result.job,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: result.job });
  }

  public async startSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { method } = req.body;
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    if (!checkCSSDPermissions(actor, res)) return;

    const actorName = (actor as any).name || actor.email || 'CSSD Specialist';
    const result = cssdRepository.startJobProcessing(id, actorName, method);

    if (!result.success || !result.job) {
      res.status(400).json({ success: false, error: 'START_JOB_FAILED', message: result.error });
      return;
    }

    await eventEngine.emitEvent({
      eventType: 'STERILIZATION_STARTED',
      entityType: 'CSSD_PACK',
      entityId: result.job.instrumentId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName,
      metadata: {
        jobId: result.job.jobId,
        method: result.job.method,
        startedAt: result.job.processingStartedAt,
        expectedCompletionAt: result.job.expectedCompletionAt,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName,
      action: 'STERILIZATION_JOB_STARTED',
      entityType: 'STERILIZATION_JOB',
      entityId: result.job.jobId,
      newState: result.job,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result.job });
  }

  public async completeSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    if (!checkCSSDPermissions(actor, res)) return;

    const actorName = (actor as any).name || actor.email || 'CSSD Specialist';
    const result = cssdRepository.completeJobProcessing(id, actorName);

    if (!result.success || !result.job) {
      res.status(400).json({ success: false, error: 'COMPLETE_JOB_FAILED', message: result.error });
      return;
    }

    await eventEngine.emitEvent({
      eventType: 'STERILIZATION_COMPLETED',
      entityType: 'CSSD_PACK',
      entityId: result.job.instrumentId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName,
      metadata: {
        jobId: result.job.jobId,
        completedAt: result.job.processingCompletedAt,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName,
      action: 'STERILIZATION_JOB_COMPLETED',
      entityType: 'STERILIZATION_JOB',
      entityId: result.job.jobId,
      newState: result.job,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result.job });
  }

  public async releaseSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    if (!checkCSSDPermissions(actor, res)) return;

    const actorName = (actor as any).name || actor.email || 'CSSD Quality Inspector';

    const {
      cycleCompleted = true,
      packagingAcceptable = true,
      indicatorVerified = true,
      releaseDecision = 'RELEASED',
      notes = '',
    } = req.body;

    const result = cssdRepository.releaseJob(
      id,
      { cycleCompleted, packagingAcceptable, indicatorVerified, releaseDecision, notes },
      actorName
    );

    if (!result.success || !result.job) {
      res.status(400).json({ success: false, error: 'RELEASE_JOB_FAILED', message: result.error });
      return;
    }

    const eventType =
      releaseDecision === 'RELEASED'
        ? 'STERILIZATION_RELEASED'
        : releaseDecision === 'REJECTED'
        ? 'STERILIZATION_REJECTED'
        : 'STERILIZATION_QUARANTINED';

    await eventEngine.emitEvent({
      eventType,
      entityType: 'CSSD_PACK',
      entityId: result.job.instrumentId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName,
      metadata: {
        jobId: result.job.jobId,
        releaseDecision,
        releasedAt: result.job.releasedAt,
        notes,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName,
      action: `STERILIZATION_JOB_${releaseDecision}`,
      entityType: 'STERILIZATION_JOB',
      entityId: result.job.jobId,
      newState: result.job,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result.job, releaseRecord: result.releaseRecord });
  }

  public async rejectSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { reason = 'Failed quality control verification' } = req.body;
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    if (!checkCSSDPermissions(actor, res)) return;

    const actorName = (actor as any).name || actor.email || 'CSSD Quality Inspector';

    const result = cssdRepository.releaseJob(
      id,
      { cycleCompleted: false, packagingAcceptable: false, indicatorVerified: false, releaseDecision: 'REJECTED', notes: reason },
      actorName
    );

    if (!result.success || !result.job) {
      res.status(400).json({ success: false, error: 'REJECT_JOB_FAILED', message: result.error });
      return;
    }

    res.json({ success: true, data: result.job });
  }

  public async quarantineSterilizationJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { reason = 'Quarantined for biological indicator verification' } = req.body;
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    if (!checkCSSDPermissions(actor, res)) return;

    const actorName = (actor as any).name || actor.email || 'CSSD QA Specialist';

    const result = cssdRepository.releaseJob(
      id,
      { cycleCompleted: true, packagingAcceptable: false, indicatorVerified: false, releaseDecision: 'QUARANTINED', notes: reason },
      actorName
    );

    if (!result.success || !result.job) {
      res.status(400).json({ success: false, error: 'QUARANTINE_JOB_FAILED', message: result.error });
      return;
    }

    res.json({ success: true, data: result.job });
  }

  // ─── HISTORY & METRICS ────────────────────────────────────────────────────
  public async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { date, instrument, qrCode, jobId, ot, status } = req.query;
    const history = cssdRepository.getSterilizationHistory({
      date: date ? String(date) : undefined,
      instrument: instrument ? String(instrument) : undefined,
      qrCode: qrCode ? String(qrCode) : undefined,
      jobId: jobId ? String(jobId) : undefined,
      ot: ot ? String(ot) : undefined,
      status: status ? String(status) : undefined,
    });
    res.json({ success: true, data: history });
  }

  public async getMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const metrics = cssdRepository.getMetrics();
    res.json({ success: true, data: metrics });
  }

  public async getCycleProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profiles = cssdRepository.getCycleProfiles();
    res.json({ success: true, data: profiles });
  }

  // ─── LEGACY CALLERS COMPATIBILITY ─────────────────────────────────────────
  public async getPacks(req: AuthenticatedRequest, res: Response): Promise<void> {
    const packs = cssdRepository.findAllPacks();
    res.json({ success: true, data: packs });
  }

  public async scanAndVerifyQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { packId, targetOT, requiredPackType, surgeryId, patientId, otId } = req.body;
    const actor = req.user || { userId: 'system', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };

    if (!packId) {
      res.status(400).json({ success: false, error: 'PACK_ID_REQUIRED', message: 'packId is required for QR scan' });
      return;
    }

    const verification = cssdRepository.verifyQR(packId, targetOT, requiredPackType, surgeryId, patientId, otId);

    await eventEngine.emitEvent({
      eventType: verification.status === 'VERIFIED' ? 'CSSD_PACK_SCANNED' : 'CSSD_PACK_BLOCKED',
      entityType: 'CSSD_PACK',
      entityId: packId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        packId,
        surgeryId: surgeryId || null,
        patientId: patientId || null,
        otId: otId || targetOT || null,
        verificationResult: verification.status,
        reasons: verification.reasons,
        targetOT,
        requiredPackType,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'CSSD_PACK_QR_SCAN',
      entityType: 'CSSD_PACK',
      entityId: packId,
      newState: { status: verification.status, reasons: verification.reasons },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: verification });
  }

  public async transitionPackStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { targetStatus, assignedOtId, assignedSurgeryId, assignedPatientId, currentLocation } = req.body;
    const actor = req.user || { userId: 'system', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };

    const result = cssdRepository.updatePackStatus(id, targetStatus as CSSDPackStatus, {
      assignedOtId,
      assignedSurgeryId,
      assignedPatientId,
      currentLocation,
    });

    if (!result.success || !result.pack) {
      res.status(400).json({ success: false, error: 'INVALID_TRANSITION', message: result.error });
      return;
    }

    res.json({ success: true, data: result.pack });
  }

  public async dispatchPack(req: AuthenticatedRequest, res: Response): Promise<void> {
    const packId = String(req.params.id || '');
    const { targetOT = 'OT-03', notes = '' } = req.body;
    const actor = req.user || { userId: 'usr_cssd', email: 'cssd@smartot.hospital', role: 'CSSD_STAFF' };
    const actorName = (actor as any).name || actor.email || 'CSSD Specialist';

    const result = cssdRepository.dispatchPack(packId, targetOT, notes, actorName);

    if (!result.success || !result.pack) {
      res.status(400).json({ success: false, error: 'DISPATCH_FAILED', message: result.error });
      return;
    }

    await eventEngine.emitEvent({
      eventType: 'CSSD_PACK_DISPATCHED',
      entityType: 'CSSD_PACK',
      entityId: packId,
      department: 'CSSD',
      actorId: actor.userId,
      actorName,
      metadata: {
        targetOT,
        notes,
        dispatchedAt: new Date().toISOString(),
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName,
      action: 'CSSD_PACK_DISPATCHED',
      entityType: 'CSSD_PACK',
      entityId: packId,
      newState: result.pack,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result.pack });
  }
}

export const cssdController = new CSSDController();
