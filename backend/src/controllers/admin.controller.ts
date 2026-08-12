import { Request, Response } from 'express';
import { db } from '../database/db';
import { OperatingTheatre, CSSDPack, Patient, User } from '../../../shared/src/types';
import { auditRepository } from '../repositories/audit.repository';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function createAudit(req: Request, action: string, entityType: string, entityId: string, prev?: any, next?: any) {
  const actor = (req as any).user;
  auditRepository.log({
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'System',
    action,
    entityType,
    entityId,
    previousState: prev,
    newState: next,
  });
}


// ─── SYSTEM SETTINGS (in-memory config with DB persistence) ──────────────────
function getSettings() {
  const data = db.getData() as any;
  if (!data.system_settings) {
    data.system_settings = {
      hospitalName: 'SmartOT Command Demo Hospital',
      hospitalCode: 'DEMO-HOSP-001',
      timezone: 'Asia/Kolkata',
      otDelayWarningMinutes: 10,
      otDelayCriticalMinutes: 20,
      turnoverWarningMinutes: 30,
      transferWarningMinutes: 15,
      aiEnabled: true,
      aiRiskPredictionEnabled: true,
      aiRecommendationsEnabled: true,
      aiConfidenceThreshold: 70,
      consentRequired: true,
      documentationRequired: true,
      preopPrepRequired: true,
      reportsRequired: true,
      doctorConfirmationRequired: true,
      alertRules: {
        consentMissing: { enabled: true, severity: 'CRITICAL', thresholdMinutes: 30 },
        packUnavailable: { enabled: true, severity: 'CRITICAL', thresholdMinutes: 0 },
        transferNotStarted: { enabled: true, severity: 'WARNING', thresholdMinutes: 15 },
        turnoverDelay: { enabled: true, severity: 'WARNING', thresholdMinutes: 30 },
        otDelay: { enabled: true, severity: 'WARNING', thresholdMinutes: 10 },
      },
      notifications: {
        inApp: true,
        email: false,
        sms: false,
        push: false,
      },
    };
    db.persist();
  }
  return data.system_settings;
}

export class AdminController {
  // ══════════════════════════════════════════════════════════════════════
  // SYSTEM SETTINGS
  // ══════════════════════════════════════════════════════════════════════
  public getSettings(req: Request, res: Response): void {
    const settings = getSettings();
    res.json({ success: true, data: settings });
  }

  public updateSettings(req: Request, res: Response): void {
    const data = db.getData() as any;
    const prev = { ...(data.system_settings || {}) };
    data.system_settings = { ...getSettings(), ...req.body };
    db.persist();
    createAudit(req, 'UPDATE_SYSTEM_SETTINGS', 'SETTINGS', 'system', prev, data.system_settings);
    res.json({ success: true, data: data.system_settings, message: 'Settings saved successfully.' });
  }

  // ══════════════════════════════════════════════════════════════════════
  // OPERATING THEATRES
  // ══════════════════════════════════════════════════════════════════════
  public getOTs(req: Request, res: Response): void {
    const data = db.getData();
    const { status, search } = req.query as Record<string, string>;
    let ots = data.operating_theatres;
    if (status && status !== 'ALL') ots = ots.filter((o) => o.currentStatus === status);
    if (search) ots = ots.filter((o) => o.code.toLowerCase().includes(search.toLowerCase()) || o.name.toLowerCase().includes(search.toLowerCase()));
    const total = data.operating_theatres.length;
    const active = data.operating_theatres.filter((o: any) => !o.archived).length;
    const archived = data.operating_theatres.filter((o: any) => o.archived).length;
    res.json({ success: true, data: ots, meta: { total, active, archived } });
  }

  public createOT(req: Request, res: Response): void {
    const data = db.getData();
    const body = req.body;
    if (!body.code || !body.name) {
      res.status(400).json({ success: false, error: 'OT code and name are required.' });
      return;
    }
    const exists = data.operating_theatres.find((o) => o.code === body.code);
    if (exists) {
      res.status(409).json({ success: false, error: `OT with code "${body.code}" already exists.` });
      return;
    }
    const newOT: OperatingTheatre & any = {
      id: genId('ot'),
      code: body.code,
      name: body.name,
      specialty: body.specialty || 'General Surgery',
      currentStatus: 'AVAILABLE' as any,
      expectedTurnoverMinutes: body.expectedTurnoverMinutes || 30,
      currentDelayMinutes: 0,
      riskLevel: 'LOW' as any,
      lastUpdated: new Date().toISOString(),
      archived: false,
      location: body.location || '',
      createdAt: new Date().toISOString(),
    };
    data.operating_theatres.push(newOT);
    db.persist();
    createAudit(req, 'CREATE_OT', 'OT', newOT.id, null, newOT);
    res.json({ success: true, data: newOT, message: `Operating Theatre ${newOT.code} created successfully.` });
  }

  public updateOT(req: Request, res: Response): void {
    const data = db.getData();
    const ot = data.operating_theatres.find((o) => o.id === req.params.id || o.code === req.params.id) as any;
    if (!ot) { res.status(404).json({ success: false, error: 'OT not found.' }); return; }
    const prev = { ...ot };
    const allowed = ['name', 'specialty', 'expectedTurnoverMinutes', 'location'];
    allowed.forEach((key) => { if (req.body[key] !== undefined) ot[key] = req.body[key]; });
    ot.lastUpdated = new Date().toISOString();
    db.persist();
    createAudit(req, 'UPDATE_OT', 'OT', ot.id, prev, ot);
    res.json({ success: true, data: ot, message: 'Changes saved successfully.' });
  }

  public archiveOT(req: Request, res: Response): void {
    const data = db.getData();
    const ot = data.operating_theatres.find((o) => o.id === req.params.id || o.code === req.params.id) as any;
    if (!ot) { res.status(404).json({ success: false, error: 'OT not found.' }); return; }
    const prev = { archived: ot.archived };
    ot.archived = req.body.archived !== false;
    ot.currentStatus = ot.archived ? 'AVAILABLE' : ot.currentStatus;
    ot.lastUpdated = new Date().toISOString();
    db.persist();
    createAudit(req, ot.archived ? 'ARCHIVE_OT' : 'RESTORE_OT', 'OT', ot.id, prev, { archived: ot.archived });
    res.json({ success: true, data: ot, message: ot.archived ? `${ot.code} archived.` : `${ot.code} restored.` });
  }

  // ══════════════════════════════════════════════════════════════════════
  // CSSD PACKS
  // ══════════════════════════════════════════════════════════════════════
  public getCSSDPacks(req: Request, res: Response): void {
    const data = db.getData();
    const { status, search } = req.query as Record<string, string>;
    let packs = data.cssd_packs;
    if (status && status !== 'ALL') packs = packs.filter((p) => p.currentStatus === status);
    if (search) packs = packs.filter((p) =>
      p.packId.toLowerCase().includes(search.toLowerCase()) ||
      p.packType.toLowerCase().includes(search.toLowerCase())
    );
    const total = data.cssd_packs.length;
    const available = data.cssd_packs.filter((p) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED').length;
    const expired = data.cssd_packs.filter((p) => p.currentStatus === 'EXPIRED' || p.sterilityStatus === 'EXPIRED').length;
    res.json({ success: true, data: packs, meta: { total, available, expired } });
  }

  public createCSSDPack(req: Request, res: Response): void {
    const data = db.getData();
    const body = req.body;
    if (!body.packId || !body.packType) {
      res.status(400).json({ success: false, error: 'Pack ID and pack type are required.' });
      return;
    }
    const exists = data.cssd_packs.find((p) => p.packId === body.packId);
    if (exists) {
      res.status(409).json({ success: false, error: `Pack "${body.packId}" already exists.` });
      return;
    }
    const sterilizedAt = body.sterilizedAt || new Date().toISOString();
    const expiresAt = body.expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    if (new Date(expiresAt) <= new Date(sterilizedAt)) {
      res.status(400).json({ success: false, error: 'Expiry date must be after sterilization date.' });
      return;
    }
    const now = new Date();
    const isExpired = new Date(expiresAt) < now;
    const newPack: CSSDPack & any = {
      id: genId('cssd'),
      packId: body.packId,
      packType: body.packType,
      sterilizationBatch: body.sterilizationBatch || `BATCH-${Date.now()}`,
      sterilizedAt,
      expiresAt,
      sterilityStatus: isExpired ? 'EXPIRED' : 'STERILIZED',
      currentStatus: isExpired ? 'EXPIRED' : 'AVAILABLE',
      currentLocation: body.currentLocation || 'CSSD Main Storage',
      notes: body.notes || '',
      updatedAt: new Date().toISOString(),
      archived: false,
    };
    data.cssd_packs.push(newPack);
    db.persist();
    createAudit(req, 'CREATE_CSSD_PACK', 'CSSD_PACK', newPack.id, null, newPack);
    res.json({ success: true, data: newPack, message: `Pack ${newPack.packId} created successfully.` });
  }

  public updateCSSDPack(req: Request, res: Response): void {
    const data = db.getData();
    const pack = data.cssd_packs.find((p) => p.id === req.params.id || p.packId === req.params.id) as any;
    if (!pack) { res.status(404).json({ success: false, error: 'Pack not found.' }); return; }
    const prev = { ...pack };
    const allowed = ['packType', 'sterilizationBatch', 'sterilizedAt', 'expiresAt', 'currentLocation', 'notes', 'currentStatus'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) pack[k] = req.body[k]; });
    // Revalidate expiry
    if (pack.expiresAt && new Date(pack.expiresAt) < new Date()) {
      pack.sterilityStatus = 'EXPIRED';
      pack.currentStatus = 'EXPIRED';
    }
    pack.updatedAt = new Date().toISOString();
    db.persist();
    createAudit(req, 'UPDATE_CSSD_PACK', 'CSSD_PACK', pack.id, prev, pack);
    res.json({ success: true, data: pack, message: 'Pack updated successfully.' });
  }

  public archiveCSSDPack(req: Request, res: Response): void {
    const data = db.getData();
    const pack = data.cssd_packs.find((p) => p.id === req.params.id || p.packId === req.params.id) as any;
    if (!pack) { res.status(404).json({ success: false, error: 'Pack not found.' }); return; }
    pack.archived = true;
    pack.currentStatus = 'BLOCKED';
    pack.updatedAt = new Date().toISOString();
    db.persist();
    createAudit(req, 'ARCHIVE_CSSD_PACK', 'CSSD_PACK', pack.id, { archived: false }, { archived: true });
    res.json({ success: true, data: pack, message: `Pack ${pack.packId} archived.` });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PATIENTS
  // ══════════════════════════════════════════════════════════════════════
  public getPatients(req: Request, res: Response): void {
    const data = db.getData();
    const { status, search, ward } = req.query as Record<string, string>;
    let patients = data.patients;
    if (status && status !== 'ALL') patients = patients.filter((p) => p.status === status);
    if (ward && ward !== 'ALL') patients = patients.filter((p) => p.wardId === ward);
    if (search) patients = patients.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase())
    );
    const total = data.patients.length;
    const active = data.patients.filter((p: any) => !p.archived).length;
    const archived = data.patients.filter((p: any) => p.archived).length;
    res.json({ success: true, data: patients, meta: { total, active, archived } });
  }

  public createPatient(req: Request, res: Response): void {
    const data = db.getData();
    const body = req.body;
    if (!body.name || !body.mrn) {
      res.status(400).json({ success: false, error: 'Patient name and MRN are required.' });
      return;
    }
    const exists = data.patients.find((p) => p.mrn === body.mrn);
    if (exists) {
      res.status(409).json({ success: false, error: `Patient with MRN "${body.mrn}" already exists.` });
      return;
    }
    const now = new Date().toISOString();
    const newPatient: Patient & any = {
      id: genId('pat'),
      mrn: body.mrn,
      name: body.name,
      age: body.age || 0,
      gender: body.gender || 'M',
      wardId: body.wardId || 'Ward 4B',
      bedNumber: body.bedNumber || 'TBD',
      admissionDate: body.admissionDate || now,
      status: 'ADMITTED',
      primaryDiagnosis: body.primaryDiagnosis || 'Pending',
      archived: false,
      createdAt: now,
    };
    data.patients.push(newPatient);
    // Create default readiness record
    (data as any).patient_readiness = (data as any).patient_readiness || [];
    (data as any).patient_readiness.push({
      id: genId('ready'),
      patientId: newPatient.id,
      admissionCompleted: true,
      consentStatus: 'PENDING',
      documentationCompleted: false,
      reportsAvailable: false,
      doctorConfirmed: false,
      preopPrepCompleted: false,
      completedItemsCount: 1,
      totalItemsCount: 6,
      isReady: false,
      updatedAt: now,
    });
    db.persist();
    createAudit(req, 'CREATE_PATIENT', 'PATIENT', newPatient.id, null, newPatient);
    res.json({ success: true, data: newPatient, message: `Patient ${newPatient.name} (${newPatient.mrn}) created.` });
  }


  public updatePatient(req: Request, res: Response): void {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === req.params.id || p.mrn === req.params.id) as any;
    if (!patient) { res.status(404).json({ success: false, error: 'Patient not found.' }); return; }
    const prev = { ...patient };
    const allowed = ['name', 'age', 'gender', 'wardId', 'bedNumber', 'primaryDiagnosis', 'status'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) patient[k] = req.body[k]; });
    patient.updatedAt = new Date().toISOString();
    db.persist();
    createAudit(req, 'UPDATE_PATIENT', 'PATIENT', patient.id, prev, patient);
    res.json({ success: true, data: patient, message: 'Patient record updated.' });
  }

  public archivePatient(req: Request, res: Response): void {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === req.params.id) as any;
    if (!patient) { res.status(404).json({ success: false, error: 'Patient not found.' }); return; }
    patient.archived = true;
    patient.status = 'DISCHARGED';
    patient.updatedAt = new Date().toISOString();
    db.persist();
    createAudit(req, 'ARCHIVE_PATIENT', 'PATIENT', patient.id, { archived: false }, { archived: true });
    res.json({ success: true, data: patient, message: `Patient ${patient.name} archived.` });
  }

  // ══════════════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════════════
  public getUsers(req: Request, res: Response): void {
    const users = db.getData().users.map((u) => ({ ...u, password: undefined }));
    res.json({ success: true, data: users, meta: { total: users.length } });
  }

  public createUser(req: Request, res: Response): void {
    const data = db.getData();
    const body = req.body;
    if (!body.email || !body.name || !body.role) {
      res.status(400).json({ success: false, error: 'Email, name, and role are required.' });
      return;
    }
    const exists = data.users.find((u) => u.email === body.email);
    if (exists) {
      res.status(409).json({ success: false, error: 'User with this email already exists.' });
      return;
    }
    const newUser: User & any = {
      id: genId('user'),
      email: body.email,
      name: body.name,
      role: body.role,
      department: body.department || 'General',
      password: 'demo1234',
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    db.persist();
    createAudit(req, 'CREATE_USER', 'USER', newUser.id, null, { ...newUser, password: '[redacted]' });
    res.json({ success: true, data: { ...newUser, password: undefined }, message: `User ${newUser.name} created.` });
  }

  public updateUser(req: Request, res: Response): void {
    const data = db.getData();
    const user = data.users.find((u) => u.id === req.params.id) as any;
    if (!user) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    const prev = { ...user, password: undefined };
    const allowed = ['name', 'role', 'department'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) user[k] = req.body[k]; });
    db.persist();
    createAudit(req, 'UPDATE_USER', 'USER', user.id, prev, { ...user, password: '[redacted]' });
    res.json({ success: true, data: { ...user, password: undefined }, message: 'User updated.' });
  }

  // ══════════════════════════════════════════════════════════════════════
  // DATA MANAGEMENT STATS
  // ══════════════════════════════════════════════════════════════════════
  public getDataStats(req: Request, res: Response): void {
    const data = db.getData() as any;
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const recentlyModified = (collection: any[]) =>
      collection.filter((r: any) => {
        const ts = r.updatedAt || r.lastUpdated || r.createdAt || r.admissionDate || r.timestamp;
        return ts && new Date(ts) > lastWeek;
      }).length;

    res.json({
      success: true,
      data: {
        patients: {
          total: data.patients.length,
          active: data.patients.filter((p: any) => !p.archived).length,
          archived: data.patients.filter((p: any) => p.archived).length,
          recentlyModified: recentlyModified(data.patients),
        },
        operatingTheatres: {
          total: data.operating_theatres.length,
          active: data.operating_theatres.filter((o: any) => !o.archived).length,
          archived: data.operating_theatres.filter((o: any) => o.archived).length,
          recentlyModified: recentlyModified(data.operating_theatres),
        },
        cssdPacks: {
          total: data.cssd_packs.length,
          available: data.cssd_packs.filter((p: any) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED').length,
          expired: data.cssd_packs.filter((p: any) => p.currentStatus === 'EXPIRED').length,
          recentlyModified: recentlyModified(data.cssd_packs),
        },
        surgeries: {
          total: data.surgeries.length,
          active: data.surgeries.filter((s: any) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length,
          completed: data.surgeries.filter((s: any) => s.status === 'COMPLETED').length,
          recentlyModified: recentlyModified(data.surgeries),
        },
        workflowEvents: {
          total: data.workflow_events.length,
          recentlyModified: recentlyModified(data.workflow_events),
        },
        alerts: {
          total: data.alerts.length,
          open: data.alerts.filter((a: any) => a.status === 'OPEN').length,
          resolved: data.alerts.filter((a: any) => a.status === 'RESOLVED').length,
          recentlyModified: recentlyModified(data.alerts),
        },
        users: {
          total: data.users.length,
          recentlyModified: recentlyModified(data.users),
        },
        auditLogs: {
          total: data.audit_logs.length,
          recentlyModified: recentlyModified(data.audit_logs),
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════
  public exportData(req: Request, res: Response): void {
    const entity = String(req.params.entity || '');
    const format = String(req.query.format || 'json');
    const data = db.getData() as any;

    const entityMap: Record<string, any[]> = {
      patients: data.patients.map((p: any) => ({ ...p, name: p.name })),
      ots: data.operating_theatres,
      cssd: data.cssd_packs,
      surgeries: data.surgeries,
      alerts: data.alerts,
      events: data.workflow_events,
      users: data.users.map((u: any) => ({ ...u, password: '[redacted]' })),
    };

    const records = entityMap[entity];
    if (!records) {
      res.status(400).json({ success: false, error: `Unknown entity: ${entity}` });
      return;
    }

    if (format === 'csv') {
      if (records.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${entity}.csv`);
        res.send('');
        return;
      }
      const headers = Object.keys(records[0]).join(',');
      const rows = records.map((r: any) =>
        Object.values(r).map((v: any) => {
          const str = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}-${Date.now()}.csv`);
      res.send(`${headers}\n${rows}`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}-${Date.now()}.json`);
      res.json(records);
    }
  }


  // ══════════════════════════════════════════════════════════════════════
  // RESET DEMO DATA
  // ══════════════════════════════════════════════════════════════════════
  public resetDemoData(req: Request, res: Response): void {
    const { confirmText } = req.body;
    if (confirmText !== 'RESET DEMO') {
      res.status(400).json({ success: false, error: 'Confirmation text does not match. Type "RESET DEMO" to confirm.' });
      return;
    }
    // Dynamically import seed to re-run
    const { seedDatabase } = require('../database/seed');
    seedDatabase(true).then(() => {
      createAudit(req, 'RESET_DEMO_DATA', 'SYSTEM', 'all', null, { resetAt: new Date().toISOString() });
      res.json({ success: true, message: 'Demo environment reset successfully. All synthetic data has been restored.' });
    }).catch((err: any) => {
      res.status(500).json({ success: false, error: `Reset failed: ${err.message}` });
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SYSTEM HEALTH
  // ══════════════════════════════════════════════════════════════════════
  public getSystemHealth(req: Request, res: Response): void {
    const data = db.getData() as any;
    const dbHealthy = Boolean(data && data.patients);
    const aiEnabled = getSettings().aiEnabled;
    const hasAIKey = Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        services: [
          { name: 'Database', status: dbHealthy ? 'OPERATIONAL' : 'DEGRADED', detail: `${data.workflow_events?.length || 0} events · ${data.patients?.length || 0} patients` },
          { name: 'API Server', status: 'OPERATIONAL', detail: 'Express v4 · All routes registered' },
          { name: 'Authentication', status: 'OPERATIONAL', detail: 'JWT-based RBAC active' },
          { name: 'Alert Engine', status: 'OPERATIONAL', detail: `${data.alerts?.filter((a: any) => a.status === 'OPEN').length || 0} open alerts` },
          { name: 'AI Consultant', status: aiEnabled ? (hasAIKey ? 'OPERATIONAL' : 'DEGRADED') : 'DISABLED', detail: aiEnabled ? (hasAIKey ? 'LLM provider connected' : 'No API key — using rule-based fallback') : 'Disabled in settings' },
          { name: 'Offline Sync', status: 'OPERATIONAL', detail: `${data.sync_queue?.length || 0} items in sync queue` },
          { name: 'CSSD Engine', status: 'OPERATIONAL', detail: `${data.cssd_packs?.length || 0} packs tracked` },
          { name: 'Event Engine', status: 'OPERATIONAL', detail: `${data.workflow_events?.length || 0} immutable events` },
        ],
        summary: {
          dbRecords: (data.patients?.length || 0) + (data.surgeries?.length || 0) + (data.cssd_packs?.length || 0),
          openAlerts: data.alerts?.filter((a: any) => a.status === 'OPEN').length || 0,
          uptime: process.uptime(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
      },
    });
  }
}

export const adminController = new AdminController();
