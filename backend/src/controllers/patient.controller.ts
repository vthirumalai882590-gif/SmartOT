import { Response } from 'express';
import { patientRepository } from '../repositories/patient.repository';
import { eventEngine } from '../events/event-engine';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { correlationEngine } from '../events/correlation-engine';

export class PatientController {
  public async getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    const patients = patientRepository.findAll();
    res.json({ success: true, data: patients });
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


    // Emit event
    await eventEngine.emitEvent({
      eventType: updatedReadiness.isReady ? 'PATIENT_READY' : 'READINESS_CHECKLIST_UPDATED',
      entityType: 'PATIENT',
      entityId: id,
      department: 'WARD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: {
        completedCount: updatedReadiness.completedItemsCount,
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
    const patient = patientRepository.findById(id);
    if (!patient) {
      res.status(404).json({ success: false, error: 'PATIENT_NOT_FOUND' });
      return;
    }

    const updated = patientRepository.updateStatus(id, 'READY_FOR_OT');
    await eventEngine.emitEvent({
      eventType: 'PATIENT_READY',
      entityType: 'PATIENT',
      entityId: id,
      department: 'WARD',
      actorId: actor.userId,
      actorName: actor.email,
      metadata: { status: 'READY_FOR_OT' },
    });

    res.json({ success: true, data: updated });
  }

  public async clearBlocker(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const actor = req.user || { userId: 'system', email: 'ward@smartot.hospital', role: 'WARD_STAFF', department: 'Ward' };
    const readiness = patientRepository.updateConsent(id, 'VERIFIED');
    res.json({ success: true, data: readiness });
  }
}

export const patientController = new PatientController();

