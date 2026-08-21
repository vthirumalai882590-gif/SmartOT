import { Response } from 'express';
import { db } from '../database/db';
import { patientRepository } from '../repositories/patient.repository';
import { patientStateService } from '../services/patient-state.service';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { correlationEngine } from '../events/correlation-engine';

export class PatientController {
  public async getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    const patients = patientRepository.findAll();
    res.json({ success: true, data: patients });
  }

  public async createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body = req.body;
    if (!body.name || !body.mrn) {
      res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Patient name and MRN are required.' });
      return;
    }
    const data = db.getData();
    const exists = data.patients.find((p) => p.mrn === body.mrn);
    if (exists) {
      res.status(409).json({ success: false, error: 'PATIENT_EXISTS', message: `Patient with MRN "${body.mrn}" already exists.` });
      return;
    }
    const now = new Date().toISOString();
    const newPatient: any = {
      id: `pat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

    (data as any).patient_readiness = (data as any).patient_readiness || [];
    const readiness = {
      id: `ready_${newPatient.id}`,
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
    };
    (data as any).patient_readiness.push(readiness);
    db.persist();

    const actor = req.user || { userId: 'system', email: 'system@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };
    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'CREATE_PATIENT',
      entityType: 'PATIENT',
      entityId: newPatient.id,
      previousState: null,
      newState: newPatient,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { ...newPatient, readiness }, message: `Patient ${newPatient.name} (${newPatient.mrn}) created successfully.` });
  }

  public async getPatientsReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    const patients = patientRepository.findAll();
    res.json({ success: true, data: patients });
  }

  public async getPatientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const patient = patientRepository.findById(id);
    if (!patient) {
      res.status(404).json({ success: false, error: 'PATIENT_NOT_FOUND' });
      return;
    }

    const timeline = patient.activeSurgeryId
      ? correlationEngine.correlateSurgeryTimeline(patient.activeSurgeryId)
      : null;

    res.json({ success: true, data: { ...patient, timeline } });
  }

  public async updateReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const updates = req.body;
    const actor = req.user || { userId: 'system', email: 'system@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };

    const prevReadiness = patientRepository.getReadiness(id);
    const updatedReadiness = patientRepository.updateReadiness(id, updates);


    // Emit event — alert engine subscribes to READINESS_UPDATED to re-evaluate consent rules
    await eventEngine.emitEvent({
      eventType: updatedReadiness.isReady ? 'PATIENT_READY' : 'READINESS_UPDATED',
      entityType: 'PATIENT',
      entityId: id,
      department: 'WARD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        patientId: id,
        completedCount: updatedReadiness.completedItemsCount,
        totalCount: updatedReadiness.totalItemsCount,
        isReady: updatedReadiness.isReady,
        consentStatus: updatedReadiness.consentStatus,
      },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'UPDATE_PATIENT_READINESS',
      entityType: 'PATIENT_READINESS',
      entityId: id,
      previousState: prevReadiness,
      newState: updatedReadiness,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedReadiness });
  }

  public async updateConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { consentStatus } = req.body;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };


    if (!consentStatus || !['PENDING', 'VERIFIED', 'MISSING'].includes(consentStatus)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_CONSENT_STATUS',
        message: 'consentStatus must be PENDING, VERIFIED, or MISSING',
      });
      return;
    }

    const prevReadiness = patientRepository.getReadiness(id);
    const updatedReadiness = patientRepository.updateConsent(id, consentStatus);

    await eventEngine.emitEvent({
      eventType: consentStatus === 'VERIFIED' ? 'CONSENT_VERIFIED' : 'CONSENT_UPDATED',
      entityType: 'PATIENT',
      entityId: id,
      department: 'WARD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: { consentStatus, isReady: updatedReadiness.isReady },
    });

    auditRepository.log({
      actorId: actor.userId,
      actorName: actor.email,
      action: 'UPDATE_CONSENT_STATUS',
      entityType: 'PATIENT',
      entityId: id,
      previousState: { consentStatus: prevReadiness?.consentStatus },
      newState: { consentStatus },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedReadiness });
  }

  public async markReady(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };

    const result = await patientStateService.transitionPatientStatus(id, 'READY_FOR_OT', {
      actorId: actor.userId,
      actorName: actor.email,
      department: 'WARD',
      ipAddress: req.ip,
    });

    if (!result.success) {
      res.status(409).json({ success: false, error: 'INVALID_STATE_TRANSITION', message: result.error });
      return;
    }

    res.json({ success: true, data: result.patient });
  }

  public async clearBlocker(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };
    const readiness = patientRepository.updateConsent(id, 'VERIFIED');
    res.json({ success: true, data: readiness });
  }
}

export const patientController = new PatientController();

