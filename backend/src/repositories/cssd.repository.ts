import { db } from '../database/db';
import {
  CSSDPack,
  CSSDItem,
  SterilizationJob,
  SterilizationCycleProfile,
  CSSDReleaseRecord,
  CSSDItemEvent,
  CSSDMetrics,
  CSSDPackStatus,
  SterilizationJobStatus,
  QRVerificationResult,
  WorkflowEvent,
} from '../../../shared/src/types';
import { isValidCSSDTransition } from '../../../shared/src/state-machines';

export class CSSDRepository {
  // ─── LEGACY COMPATIBILITY (CSSD PACKS) ──────────────────────────────────
  findAllPacks(): CSSDPack[] {
    const data = db.getData();
    if (data.cssd_packs && data.cssd_packs.length > 0) {
      return data.cssd_packs;
    }
    return (data.cssd_items || []).map((item) => ({
      id: item.id,
      packId: item.qrCode,
      packType: item.name,
      sterilizationBatch: item.cycleReference || 'BATCH-2026',
      sterilizedAt: item.lastSterilizedAt || item.createdAt,
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      sterilityStatus: item.currentStatus === 'STERILE' || item.currentStatus === 'AVAILABLE' ? 'STERILIZED' : 'UNSTERILIZED',
      currentStatus: item.currentStatus,
      currentLocation: item.location,
      assignedOtId: item.assignedOtId,
      assignedSurgeryId: item.assignedSurgeryId,
      assignedPatientId: item.assignedPatientId,
      updatedAt: item.updatedAt,
    }));
  }

  findPackById(id: string): CSSDPack | undefined {
    const packs = this.findAllPacks();
    return packs.find((p) => p.id === id || p.packId === id);
  }

  findAvailablePacksByType(packType?: string): CSSDPack[] {
    if (!packType) return [];
    const packs = this.findAllPacks();
    const now = new Date().toISOString();
    return packs.filter(
      (p) =>
        p.packType &&
        p.packType.toLowerCase().includes(packType.toLowerCase()) &&
        (p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED' || p.currentStatus === 'STERILE') &&
        p.sterilityStatus === 'STERILIZED' &&
        p.expiresAt > now
    );
  }

  transitionPackStatus(
    packId: string,
    targetStatus: string,
    metadata?: { assignedOtId?: string; assignedSurgeryId?: string; assignedPatientId?: string }
  ): { success: boolean; pack?: CSSDPack; error?: string } {
    const item = this.findItemById(packId);
    if (item) {
      item.currentStatus = targetStatus as any;
      if (metadata?.assignedOtId) item.assignedOtId = metadata.assignedOtId;
      if (metadata?.assignedSurgeryId) item.assignedSurgeryId = metadata.assignedSurgeryId;
      if (metadata?.assignedPatientId) item.assignedPatientId = metadata.assignedPatientId;
      item.updatedAt = new Date().toISOString();
      db.persist();
      const pack = this.findPackById(packId);
      return { success: true, pack };
    }

    const data = db.getData();
    if (data.cssd_packs) {
      const p = data.cssd_packs.find((p) => p.id === packId || p.packId === packId);
      if (p) {
        p.currentStatus = targetStatus as any;
        if (metadata?.assignedOtId) p.assignedOtId = metadata.assignedOtId;
        if (metadata?.assignedSurgeryId) p.assignedSurgeryId = metadata.assignedSurgeryId;
        if (metadata?.assignedPatientId) p.assignedPatientId = metadata.assignedPatientId;
        p.updatedAt = new Date().toISOString();
        db.persist();
        return { success: true, pack: p };
      }
    }

    return { success: false, error: `CSSD pack "${packId}" not found` };
  }

  // ─── MASTER INSTRUMENT / ITEM CATALOG ─────────────────────────────────────
  findAllItems(): CSSDItem[] {
    return db.getData().cssd_items || [];
  }

  findItemById(id: string): CSSDItem | undefined {
    const data = db.getData();
    return (data.cssd_items || []).find((item) => item.id === id || item.qrCode === id);
  }

  findItemByQR(qrCode: string): CSSDItem | undefined {
    const data = db.getData();
    const code = qrCode.trim().toUpperCase();
    return (data.cssd_items || []).find(
      (item) => item.qrCode.toUpperCase() === code || item.id.toUpperCase() === code
    );
  }

  createItem(itemData: Partial<CSSDItem>): CSSDItem {
    const data = db.getData();
    const now = new Date().toISOString();
    const newItem: CSSDItem = {
      id: itemData.id || `item_${Date.now()}`,
      name: itemData.name || 'Unnamed Instrument Set',
      qrCode: itemData.qrCode || `INS-${Math.floor(1000 + Math.random() * 9000)}`,
      category: itemData.category || 'Surgical Instrument',
      quantity: itemData.quantity && itemData.quantity > 0 ? itemData.quantity : 1,
      location: itemData.location || 'CSSD Storage Area A',
      currentStatus: itemData.currentStatus || 'STERILE',
      lastSterilizedAt: itemData.lastSterilizedAt || now,
      sterilizationMethod: itemData.sterilizationMethod || 'Steam Autoclave Standard (134°C)',
      cycleReference: itemData.cycleReference || `CYC-${Date.now().toString().slice(-4)}`,
      condition: itemData.condition || 'EXCELLENT',
      releasedBy: itemData.releasedBy || 'CSSD Supervisor',
      releasedAt: itemData.releasedAt || now,
      manufacturer: itemData.manufacturer || 'Standard Surgical',
      model: itemData.model || 'GEN-2026',
      serialNumber: itemData.serialNumber || `SN-${Math.floor(10000 + Math.random() * 90000)}`,
      notes: itemData.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    data.cssd_items.push(newItem);
    db.persist();
    return newItem;
  }

  // ─── CYCLE PROFILES ────────────────────────────────────────────────────────
  getCycleProfiles(): SterilizationCycleProfile[] {
    return db.getData().cssd_cycle_profiles || [];
  }

  // ─── STERILIZATION JOBS ─────────────────────────────────────────────────────
  findAllJobs(): SterilizationJob[] {
    return db.getData().cssd_sterilization_jobs || [];
  }

  findJobById(id: string): SterilizationJob | undefined {
    const data = db.getData();
    return (data.cssd_sterilization_jobs || []).find((j) => j.id === id || j.jobId === id);
  }

  findActiveJobByItem(itemId: string, qrCode: string): SterilizationJob | undefined {
    const data = db.getData();
    return (data.cssd_sterilization_jobs || []).find(
      (j) =>
        (j.instrumentId === itemId || j.qrCode === qrCode) &&
        ['RECEIVED', 'QUEUED', 'PROCESSING', 'RELEASE_PENDING'].includes(j.status)
    );
  }

  createSterilizationJob(
    payload: {
      instrumentId: string;
      qrCode?: string;
      quantity?: number;
      currentLocation?: string;
      sourceDepartment?: string;
      sourceOT?: string;
      associatedSurgeryId?: string;
      condition?: string;
      notes?: string;
      method?: string;
    },
    actorName: string
  ): { success: boolean; job?: SterilizationJob; error?: string } {
    const data = db.getData();
    const item = this.findItemById(payload.instrumentId) || this.findItemByQR(payload.qrCode || payload.instrumentId);

    // Rule 9 Validation:
    if (!item) {
      return { success: false, error: 'Instrument or QR identifier does not exist in CSSD master database.' };
    }

    if (item.currentStatus === 'PROCESSING' || item.currentStatus === 'STERILIZING') {
      return { success: false, error: 'Cannot create sterilization request. Reason: This instrument is already undergoing an active sterilization cycle.' };
    }

    if (item.currentStatus === 'QUEUED' || item.currentStatus === 'RECEIVED') {
      return { success: false, error: 'Cannot create sterilization request. Reason: This instrument is already queued in CSSD.' };
    }

    if (item.currentStatus === 'QUARANTINED') {
      return { success: false, error: 'Cannot create sterilization request. Reason: Instrument is currently QUARANTINED due to quality failure.' };
    }

    const activeJob = this.findActiveJobByItem(item.id, item.qrCode);
    if (activeJob) {
      return { success: false, error: `Duplicate request rejected. Active job ${activeJob.jobId} already exists for this item.` };
    }

    const qty = payload.quantity && payload.quantity > 0 ? payload.quantity : item.quantity || 1;
    const now = new Date().toISOString();
    const nextJobId = `J-${100 + ((data.cssd_sterilization_jobs || []).length + 1)}`;

    // Resolve associated surgery if any
    let surgeryObj: any;
    if (payload.associatedSurgeryId) {
      surgeryObj = data.surgeries.find((s) => s.id === payload.associatedSurgeryId);
    }

    const newJob: SterilizationJob = {
      id: `job_${Date.now()}`,
      jobId: nextJobId,
      instrumentId: item.id,
      instrumentName: item.name,
      qrCode: item.qrCode,
      quantity: qty,
      sourceDepartment: payload.sourceDepartment || payload.sourceOT || 'Operating Theatre',
      sourceOT: payload.sourceOT || (surgeryObj ? surgeryObj.otCode : undefined),
      associatedSurgeryId: payload.associatedSurgeryId,
      associatedSurgeryName: surgeryObj ? surgeryObj.procedureName : undefined,
      submittedBy: actorName || 'CSSD Staff',
      submittedAt: now,
      receivedBy: actorName || 'CSSD Specialist',
      receivedAt: now,
      status: 'QUEUED',
      method: payload.method || item.sterilizationMethod || 'Steam Autoclave Standard (134°C)',
      cycleReference: `CYC-${Date.now().toString().slice(-4)}`,
      notes: payload.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    data.cssd_sterilization_jobs = data.cssd_sterilization_jobs || [];
    data.cssd_sterilization_jobs.push(newJob);

    // Update item status to QUEUED
    item.currentStatus = 'QUEUED';
    item.location = payload.currentLocation || 'CSSD Intake Decontamination Bay';
    item.updatedAt = now;

    // Record Event
    data.cssd_item_events = data.cssd_item_events || [];
    const event: CSSDItemEvent = {
      id: `cie_${Date.now()}`,
      itemId: item.id,
      jobId: newJob.id,
      eventType: 'STERILIZATION_JOB_CREATED',
      fromStatus: 'RETURNED_TO_CSSD',
      toStatus: 'QUEUED',
      actorId: actorName,
      actorName,
      timestamp: now,
      notes: `Sterilization job ${newJob.jobId} created for ${item.name}`,
    };
    data.cssd_item_events.push(event);

    db.persist();
    return { success: true, job: newJob };
  }

  // ─── START PROCESSING ─────────────────────────────────────────────────────
  startJobProcessing(jobId: string, actorName: string, method?: string): { success: boolean; job?: SterilizationJob; error?: string } {
    const data = db.getData();
    const job = this.findJobById(jobId);
    if (!job) return { success: false, error: `Sterilization job "${jobId}" not found` };

    if (!['RECEIVED', 'QUEUED'].includes(job.status)) {
      return { success: false, error: `Cannot start processing for job in status "${job.status}"` };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const selectedMethod = method || job.method || 'Steam Autoclave Standard (134°C)';
    const profiles = this.getCycleProfiles();
    const profile = profiles.find((p) => p.method === selectedMethod) || profiles[0] || { totalExpectedDurationMinutes: 45 };
    const expectedMinutes = profile.totalExpectedDurationMinutes || 45;

    const expectedCompletionAt = new Date(now.getTime() + expectedMinutes * 60000).toISOString();

    job.status = 'PROCESSING';
    job.method = selectedMethod;
    job.processingStartedAt = nowIso;
    job.expectedCompletionAt = expectedCompletionAt;
    job.updatedAt = nowIso;

    // Update item
    const item = this.findItemById(job.instrumentId) || this.findItemByQR(job.qrCode);
    if (item) {
      item.currentStatus = 'PROCESSING';
      item.sterilizationMethod = selectedMethod;
      item.location = 'Autoclave Chamber #1';
      item.updatedAt = nowIso;
    }

    // Record Event
    data.cssd_item_events = data.cssd_item_events || [];
    data.cssd_item_events.push({
      id: `cie_${Date.now()}`,
      itemId: job.instrumentId,
      jobId: job.id,
      eventType: 'STERILIZATION_STARTED',
      fromStatus: 'QUEUED',
      toStatus: 'PROCESSING',
      actorId: actorName,
      actorName,
      timestamp: nowIso,
      notes: `Started cycle ${job.cycleReference}. Expected duration: ${expectedMinutes}m`,
    });

    db.persist();
    return { success: true, job };
  }

  // ─── COMPLETE PROCESSING ──────────────────────────────────────────────────
  completeJobProcessing(jobId: string, actorName: string): { success: boolean; job?: SterilizationJob; error?: string } {
    const data = db.getData();
    const job = this.findJobById(jobId);
    if (!job) return { success: false, error: `Sterilization job "${jobId}" not found` };

    if (job.status !== 'PROCESSING') {
      return { success: false, error: `Cannot complete cycle for job in status "${job.status}"` };
    }

    const nowIso = new Date().toISOString();
    job.status = 'RELEASE_PENDING';
    job.processingCompletedAt = nowIso;
    job.updatedAt = nowIso;

    const item = this.findItemById(job.instrumentId) || this.findItemByQR(job.qrCode);
    if (item) {
      item.currentStatus = 'RELEASE_PENDING';
      item.location = 'CSSD Release & Inspection Station';
      item.updatedAt = nowIso;
    }

    data.cssd_item_events = data.cssd_item_events || [];
    data.cssd_item_events.push({
      id: `cie_${Date.now()}`,
      itemId: job.instrumentId,
      jobId: job.id,
      eventType: 'STERILIZATION_COMPLETED',
      fromStatus: 'PROCESSING',
      toStatus: 'RELEASE_PENDING',
      actorId: actorName,
      actorName,
      timestamp: nowIso,
      notes: `Cycle ${job.cycleReference} completed. Waiting for quality verification & release check.`,
    });

    db.persist();
    return { success: true, job };
  }

  // ─── RELEASE CHECK (RELEASE / REJECT / QUARANTINE) ─────────────────────────
  releaseJob(
    jobId: string,
    releasePayload: {
      cycleCompleted: boolean;
      packagingAcceptable: boolean;
      indicatorVerified: boolean;
      releaseDecision: 'RELEASED' | 'REJECTED' | 'QUARANTINED';
      notes?: string;
    },
    actorName: string
  ): { success: boolean; job?: SterilizationJob; releaseRecord?: CSSDReleaseRecord; error?: string } {
    const data = db.getData();
    const job = this.findJobById(jobId);
    if (!job) return { success: false, error: `Sterilization job "${jobId}" not found` };

    if (job.status !== 'RELEASE_PENDING' && job.status !== 'COMPLETED' && job.status !== 'PROCESSING') {
      return { success: false, error: `Cannot perform release check on job in status "${job.status}"` };
    }

    const nowIso = new Date().toISOString();
    const decision = releasePayload.releaseDecision;

    data.cssd_releases = data.cssd_releases || [];
    const releaseRecord: CSSDReleaseRecord = {
      id: `rel_${Date.now()}`,
      jobId: job.id,
      instrumentId: job.instrumentId,
      cycleCompleted: releasePayload.cycleCompleted,
      packagingAcceptable: releasePayload.packagingAcceptable,
      indicatorVerified: releasePayload.indicatorVerified,
      releaseDecision: decision,
      notes: releasePayload.notes || '',
      releasedBy: actorName,
      releasedAt: nowIso,
    };
    data.cssd_releases.push(releaseRecord);

    job.releasedBy = actorName;
    job.releasedAt = nowIso;
    job.updatedAt = nowIso;
    if (releasePayload.notes) job.notes = `${job.notes ? job.notes + ' | ' : ''}${releasePayload.notes}`;

    const item = this.findItemById(job.instrumentId) || this.findItemByQR(job.qrCode);

    if (decision === 'RELEASED') {
      job.status = 'RELEASED';
      if (item) {
        item.currentStatus = 'STERILE';
        item.lastSterilizedAt = nowIso;
        item.sterilizationMethod = job.method;
        item.cycleReference = job.cycleReference;
        item.location = 'CSSD Sterile Store Shelf A-1';
        item.releasedBy = actorName;
        item.releasedAt = nowIso;
        item.updatedAt = nowIso;
      }
    } else if (decision === 'REJECTED') {
      job.status = 'REJECTED';
      job.rejectionReason = releasePayload.notes || 'Failed quality inspection checks';
      if (item) {
        item.currentStatus = 'REJECTED';
        item.location = 'CSSD Reprocessing Intake';
        item.updatedAt = nowIso;
      }
    } else {
      job.status = 'QUARANTINED';
      job.rejectionReason = releasePayload.notes || 'Quarantined for biological verification delay or packaging defect';
      if (item) {
        item.currentStatus = 'QUARANTINED';
        item.location = 'CSSD Quarantine Area Q-1';
        item.updatedAt = nowIso;
      }
    }

    const eventType =
      decision === 'RELEASED'
        ? 'STERILIZATION_RELEASED'
        : decision === 'REJECTED'
        ? 'STERILIZATION_REJECTED'
        : 'STERILIZATION_QUARANTINED';

    data.cssd_item_events = data.cssd_item_events || [];
    data.cssd_item_events.push({
      id: `cie_${Date.now()}`,
      itemId: job.instrumentId,
      jobId: job.id,
      eventType,
      fromStatus: 'RELEASE_PENDING',
      toStatus: item ? item.currentStatus : decision,
      actorId: actorName,
      actorName,
      timestamp: nowIso,
      notes: `Release verification decision: ${decision}. ${releasePayload.notes || ''}`,
    });

    db.persist();
    return { success: true, job, releaseRecord };
  }

  // ─── HISTORY & EVENT TIMELINE ─────────────────────────────────────────────
  getSterilizationHistory(filters?: {
    date?: string;
    instrument?: string;
    qrCode?: string;
    jobId?: string;
    ot?: string;
    status?: string;
  }): SterilizationJob[] {
    let jobs = this.findAllJobs();
    if (!filters) return jobs;

    if (filters.jobId) {
      jobs = jobs.filter((j) => j.jobId.toLowerCase().includes(filters.jobId!.toLowerCase()));
    }
    if (filters.qrCode) {
      jobs = jobs.filter((j) => j.qrCode.toLowerCase().includes(filters.qrCode!.toLowerCase()));
    }
    if (filters.instrument) {
      jobs = jobs.filter((j) => j.instrumentName.toLowerCase().includes(filters.instrument!.toLowerCase()));
    }
    if (filters.ot) {
      jobs = jobs.filter((j) => j.sourceOT && j.sourceOT.toLowerCase().includes(filters.ot!.toLowerCase()));
    }
    if (filters.status && filters.status !== 'ALL') {
      jobs = jobs.filter((j) => j.status === filters.status);
    }

    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getItemEvents(itemIdOrQR: string): CSSDItemEvent[] {
    const data = db.getData();
    const item = this.findItemById(itemIdOrQR) || this.findItemByQR(itemIdOrQR);
    const targetId = item ? item.id : itemIdOrQR;
    return (data.cssd_item_events || [])
      .filter((e) => e.itemId === targetId || e.jobId === targetId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ─── METRICS ──────────────────────────────────────────────────────────────
  getMetrics(): CSSDMetrics {
    const items = this.findAllItems();
    const jobs = this.findAllJobs();
    const now = new Date().getTime();

    const sterileItemsAvailable = items.filter(
      (i) => i.currentStatus === 'STERILE' || i.currentStatus === 'AVAILABLE' || i.currentStatus === 'STORED'
    ).length;

    const itemsInUse = items.filter(
      (i) => i.currentStatus === 'IN_USE' || i.currentStatus === 'ASSIGNED'
    ).length;

    const waitingForSterilization = jobs.filter(
      (j) => j.status === 'QUEUED' || j.status === 'RECEIVED'
    ).length;

    const currentlyProcessing = jobs.filter((j) => j.status === 'PROCESSING').length;

    const releasePending = jobs.filter(
      (j) => j.status === 'RELEASE_PENDING' || j.status === 'COMPLETED'
    ).length;

    const rejectedOrQuarantined = jobs.filter(
      (j) => j.status === 'REJECTED' || j.status === 'QUARANTINED'
    ).length;

    const completedToday = jobs.filter((j) => {
      if (j.status !== 'RELEASED' && j.status !== 'COMPLETED') return false;
      const t = new Date(j.releasedAt || j.updatedAt).getTime();
      return now - t < 86400000;
    }).length;

    // Average processing time calculation
    const completedJobs = jobs.filter((j) => j.processingStartedAt && j.processingCompletedAt);
    let avgMinutes = 38; // realistic baseline fallback
    if (completedJobs.length > 0) {
      const totalMinutes = completedJobs.reduce((acc, j) => {
        const start = new Date(j.processingStartedAt!).getTime();
        const end = new Date(j.processingCompletedAt!).getTime();
        return acc + Math.max(1, Math.round((end - start) / 60000));
      }, 0);
      avgMinutes = Math.round(totalMinutes / completedJobs.length);
    }

    // Delayed jobs calculation
    const delayedJobsCount = jobs.filter((j) => {
      if (j.status !== 'PROCESSING' || !j.expectedCompletionAt) return false;
      return new Date(j.expectedCompletionAt).getTime() < now;
    }).length;

    return {
      sterileItemsAvailable,
      itemsInUse,
      waitingForSterilization,
      currentlyProcessing,
      completedToday,
      releasePending,
      rejectedOrQuarantined,
      averageProcessingTimeMinutes: avgMinutes,
      delayedJobsCount,
    };
  }

  // ─── QR VERIFICATION (SCANNER ENGINE) ─────────────────────────────────────
  verifyQR(
    packIdInput: string,
    targetOT?: string,
    requiredPackType?: string,
    surgeryId?: string,
    patientId?: string,
    otId?: string
  ): QRVerificationResult {
    const inputClean = packIdInput.trim().toUpperCase();
    const item = this.findItemByQR(inputClean) || this.findItemById(inputClean);
    const legacyPack = this.findPackById(inputClean);
    const dbData = db.getData();

    const targetPackOrItem = item || legacyPack;

    if (!targetPackOrItem) {
      return {
        valid: false,
        packId: packIdInput,
        status: 'BLOCKED',
        message: 'Instrument Not Found',
        reasons: ['QR identifier does not exist in Central Sterile database'],
        suggestedAction: 'Verify physical label or index instrument in CSSD Admin Settings.',
      };
    }

    const itemStatus = targetPackOrItem.currentStatus;
    const reasons: string[] = [];

    // Expiry check
    if ('expiresAt' in targetPackOrItem && targetPackOrItem.expiresAt) {
      const expiryDate = new Date(targetPackOrItem.expiresAt);
      if (expiryDate < new Date() || ('sterilityStatus' in targetPackOrItem && targetPackOrItem.sterilityStatus === 'EXPIRED') || itemStatus === 'EXPIRED') {
        reasons.push(`Sterile barrier validity expired on ${expiryDate.toLocaleDateString()}`);
      }
    }

    // Sterility check
    if ('sterilityStatus' in targetPackOrItem && targetPackOrItem.sterilityStatus === 'UNSTERILIZED') {
      reasons.push('Biological/chemical indicator not certified; pack is unsterilized');
    }

    // Status check
    if (itemStatus === 'BLOCKED') {
      reasons.push('Instrument flagged as damaged or contaminated');
    } else if (itemStatus === 'QUARANTINED') {
      reasons.push('Instrument currently QUARANTINED following packaging or indicator failure');
    } else if (itemStatus === 'REJECTED') {
      reasons.push('Instrument REJECTED during release inspection; requires reprocessing');
    } else if (itemStatus === 'PROCESSING' || itemStatus === 'STERILIZING') {
      reasons.push('Instrument currently undergoing active sterilization cycle inside chamber');
    } else if (itemStatus === 'QUEUED' || itemStatus === 'RECEIVED') {
      reasons.push('Instrument queued in CSSD intake decontamination bay');
    } else if (itemStatus === 'IN_USE') {
      reasons.push(`Instrument currently deployed in surgery in ${targetPackOrItem.assignedOtId || 'Operating Suite'}`);
    }

    // Type match check
    const packTypeName = 'packType' in targetPackOrItem ? targetPackOrItem.packType : (targetPackOrItem as CSSDItem).name;
    if (requiredPackType && packTypeName.toLowerCase() !== requiredPackType.toLowerCase()) {
      reasons.push(`Mismatched tray type: Scanned "${packTypeName}", but procedure requires "${requiredPackType}"`);
    }

    // Relational surgery check
    let surgeryObj: any;
    if (surgeryId) {
      surgeryObj = dbData.surgeries.find((s) => s.id === surgeryId);
      if (!surgeryObj) {
        reasons.push(`Surgery "${surgeryId}" referenced in scan does not exist`);
      }
    }

    // Relational patient check
    if (patientId) {
      const patientObj = dbData.patients.find((p) => p.id === patientId || p.mrn === patientId);
      if (!patientObj) {
        reasons.push(`Patient "${patientId}" referenced in scan does not exist`);
      }
    }

    if (surgeryObj && patientId && surgeryObj.patientId !== patientId) {
      reasons.push(`Surgery "${surgeryObj.id}" belongs to patient "${surgeryObj.patientId}", not target patient "${patientId}"`);
    }

    // Relational OT check
    const targetOtIdentifier = otId || targetOT;
    if (targetOtIdentifier) {
      const otObj = dbData.operating_theatres.find(
        (o) => o.id === targetOtIdentifier || o.code.toUpperCase() === targetOtIdentifier.trim().toUpperCase()
      );
      if (!otObj) {
        reasons.push(`Target Operating Theatre "${targetOtIdentifier}" does not exist`);
      } else if (surgeryObj && surgeryObj.otId !== otObj.id) {
        reasons.push(`Surgery "${surgeryObj.id}" is scheduled for ${surgeryObj.otCode || surgeryObj.otId}, not ${targetOtIdentifier}`);
      }
    }

    // Check recent active job
    const activeJob = this.findActiveJobByItem(
      targetPackOrItem.id,
      'packId' in targetPackOrItem ? targetPackOrItem.packId : (targetPackOrItem as CSSDItem).qrCode
    );

    // Latest workflow event
    const events = (dbData.workflow_events || []).filter(
      (e) =>
        e.entityId === targetPackOrItem.id ||
        e.entityId === ('packId' in targetPackOrItem ? targetPackOrItem.packId : (targetPackOrItem as CSSDItem).qrCode)
    );
    const latestEvent = events.length > 0 ? events[events.length - 1] : null;

    const packIdStr = 'packId' in targetPackOrItem ? targetPackOrItem.packId : targetPackOrItem.qrCode;

    if (reasons.length > 0) {
      return {
        valid: false,
        packId: packIdStr,
        pack: targetPackOrItem as any,
        status: 'BLOCKED',
        message: 'PACK BLOCKED: Verification or Relational Issue',
        reasons,
        suggestedAction: 'Do NOT introduce into active sterile field.',
        latestEvent,
        activeJob,
      };
    }

    return {
      valid: true,
      packId: packIdStr,
      pack: targetPackOrItem as any,
      status: 'VERIFIED',
      message: 'INSTRUMENT VERIFIED: Certified Sterile & Available',
      reasons: [
        `Status: ${itemStatus}`,
        `Location: ${'currentLocation' in targetPackOrItem ? targetPackOrItem.currentLocation : targetPackOrItem.location}`,
        `Method: ${'sterilizationMethod' in targetPackOrItem ? targetPackOrItem.sterilizationMethod : 'Steam Autoclave Standard'}`,
      ],
      suggestedAction: targetOtIdentifier ? `Ready for sterile transfer and deployment to ${targetOtIdentifier}` : 'Ready for surgical transfer & deployment',
      latestEvent,
      activeJob,
    };
  }

  // ─── LEGACY STATUS UPDATE ─────────────────────────────────────────────────
  updatePackStatus(
    packId: string,
    newStatus: CSSDPackStatus,
    metadata?: Partial<CSSDPack>
  ): { success: boolean; pack?: CSSDPack; error?: string } {
    const data = db.getData();
    const pack = data.cssd_packs.find((p) => p.id === packId || p.packId === packId);
    const item = data.cssd_items.find((i) => i.id === packId || i.qrCode === packId);

    if (!pack && !item) {
      return { success: false, error: `CSSD Item/Pack "${packId}" not found` };
    }

    if (pack) {
      if (!isValidCSSDTransition(pack.currentStatus, newStatus)) {
        return { success: false, error: `Invalid CSSD transition from "${pack.currentStatus}" to "${newStatus}"` };
      }
      pack.currentStatus = newStatus;
      pack.updatedAt = new Date().toISOString();
      if (metadata?.assignedOtId) pack.assignedOtId = metadata.assignedOtId;
      if (metadata?.assignedSurgeryId) pack.assignedSurgeryId = metadata.assignedSurgeryId;
      if (metadata?.assignedPatientId) pack.assignedPatientId = metadata.assignedPatientId;
      if (metadata?.currentLocation) pack.currentLocation = metadata.currentLocation;
    }

    if (item) {
      item.currentStatus = newStatus;
      item.updatedAt = new Date().toISOString();
      if (metadata?.assignedOtId) item.assignedOtId = metadata.assignedOtId;
      if (metadata?.assignedSurgeryId) item.assignedSurgeryId = metadata.assignedSurgeryId;
      if (metadata?.assignedPatientId) item.assignedPatientId = metadata.assignedPatientId;
      if (metadata?.currentLocation) item.location = metadata.currentLocation;
    }

    db.persist();
    return { success: true, pack: pack || (item as any) };
  }

  dispatchPack(
    packIdInput: string,
    targetOT: string,
    notes?: string,
    actorName?: string
  ): { success: boolean; pack?: any; error?: string } {
    const data = db.getData();
    const item = this.findItemByQR(packIdInput) || this.findItemById(packIdInput);
    const legacyPack = this.findPackById(packIdInput);
    const target = item || legacyPack;

    if (!target) {
      return { success: false, error: `Instrument/Pack "${packIdInput}" not found in database.` };
    }

    const nowIso = new Date().toISOString();
    const targetLocation = `${targetOT} Sterile Anteroom`;

    if ('qrCode' in target) {
      (target as CSSDItem).currentStatus = 'ASSIGNED';
      (target as CSSDItem).assignedOtId = targetOT;
      (target as CSSDItem).location = targetLocation;
      (target as CSSDItem).updatedAt = nowIso;
    }
    if ('packId' in target) {
      (target as CSSDPack).currentStatus = 'ASSIGNED';
      (target as CSSDPack).assignedOtId = targetOT;
      (target as CSSDPack).currentLocation = targetLocation;
      (target as CSSDPack).updatedAt = nowIso;
    }

    data.cssd_item_events = data.cssd_item_events || [];
    data.cssd_item_events.push({
      id: `cie_dispatch_${Date.now()}`,
      itemId: target.id,
      eventType: 'CSSD_PACK_DISPATCHED',
      fromStatus: 'AVAILABLE',
      toStatus: 'ASSIGNED',
      actorId: actorName || 'CSSD Specialist',
      actorName: actorName || 'CSSD Specialist',
      timestamp: nowIso,
      notes: `Dispatched from CSSD Storage Bay to ${targetOT}. ${notes || ''}`,
    });

    db.persist();
    return { success: true, pack: target };
  }
}

export const cssdRepository = new CSSDRepository();
