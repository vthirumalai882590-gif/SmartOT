import { db } from '../database/db';
import { Patient, PatientReadiness, ConsentStatus, PatientStatus } from '../../../shared/src/types';

// Explicit valid patient state machine transitions
const VALID_PATIENT_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  ADMITTED: ['PREPARING', 'READY_FOR_OT', 'IN_TRANSFER'],
  PREPARING: ['READY_FOR_OT', 'ADMITTED', 'IN_TRANSFER'],
  READY_FOR_OT: ['IN_TRANSFER', 'PREPARING'],
  IN_TRANSFER: ['IN_OT'],
  IN_OT: ['IN_SURGERY', 'IN_TRANSFER'],
  IN_SURGERY: ['POST_OP'],
  POST_OP: ['DISCHARGED'],
  DISCHARGED: [],
};

export class PatientRepository {
  findAll(): Patient[] {
    const data = db.getData();
    return data.patients.map((p) => {
      const readiness = data.patient_readiness.find((r) => r.patientId === p.id);
      return { ...p, readiness };
    });
  }

  findById(id: string): Patient | undefined {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === id || p.mrn === id);
    if (!patient) return undefined;
    const readiness = data.patient_readiness.find((r) => r.patientId === patient.id);
    return { ...patient, readiness };
  }

  getReadiness(patientId: string): PatientReadiness | undefined {
    return db.getData().patient_readiness.find((r) => r.patientId === patientId);
  }

  updateReadiness(
    patientId: string,
    updates: Partial<Omit<PatientReadiness, 'id' | 'patientId' | 'updatedAt'>>
  ): PatientReadiness {
    const data = db.getData();
    let readiness = data.patient_readiness.find((r) => r.patientId === patientId);

    if (!readiness) {
      readiness = {
        id: `readiness_${patientId}`,
        patientId,
        admissionCompleted: true,
        consentStatus: 'PENDING',
        documentationCompleted: false,
        reportsAvailable: false,
        doctorConfirmed: false,
        preopPrepCompleted: false,
        completedItemsCount: 1,
        totalItemsCount: 6,
        isReady: false,
        updatedAt: new Date().toISOString(),
      };
      data.patient_readiness.push(readiness);
    }

    Object.assign(readiness, updates);

    // Recompute total count and readiness state
    const completed =
      (readiness.admissionCompleted ? 1 : 0) +
      (readiness.consentStatus === 'VERIFIED' ? 1 : 0) +
      (readiness.documentationCompleted ? 1 : 0) +
      (readiness.reportsAvailable ? 1 : 0) +
      (readiness.doctorConfirmed ? 1 : 0) +
      (readiness.preopPrepCompleted ? 1 : 0);

    readiness.completedItemsCount = completed;

    // FIX: Use totalItemsCount from the record, not hard-coded 6
    readiness.isReady = completed === readiness.totalItemsCount && readiness.consentStatus === 'VERIFIED';
    readiness.updatedAt = new Date().toISOString();

    // Sync patient status via state machine (only valid transitions)
    const patient = data.patients.find((p) => p.id === patientId);
    if (patient) {
      if (readiness.isReady && patient.status === 'PREPARING') {
        patient.status = 'READY_FOR_OT';
        patient.updatedAt = new Date().toISOString();
      } else if (!readiness.isReady && patient.status === 'READY_FOR_OT') {
        patient.status = 'PREPARING';
        patient.updatedAt = new Date().toISOString();
      }
    }

    db.persist();
    return readiness;
  }

  updateConsent(patientId: string, consentStatus: ConsentStatus): PatientReadiness {
    return this.updateReadiness(patientId, { consentStatus });
  }

  /**
   * FIX: updateStatus now enforces the patient state machine.
   * Returns { success, patient } on success, or { success: false, error } on invalid transition.
   * All controllers must use this method — direct `patient.status = X` is forbidden.
   */
  updateStatus(patientId: string, status: PatientStatus): { success: boolean; patient?: Patient; error?: string } {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === patientId);

    if (!patient) {
      return { success: false, error: `Patient "${patientId}" not found` };
    }

    const currentStatus = patient.status as PatientStatus;

    // Allow no-op (same status) silently
    if (currentStatus === status) {
      return { success: true, patient };
    }

    const allowedNext = VALID_PATIENT_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      return {
        success: false,
        error: `Invalid patient state transition: "${currentStatus}" → "${status}". ` +
               `Allowed transitions from "${currentStatus}": [${allowedNext.join(', ') || 'none'}].`,
      };
    }

    patient.status = status;
    patient.updatedAt = new Date().toISOString();
    db.persist();
    return { success: true, patient };
  }

  /**
   * Force-set status bypassing state machine. Use ONLY for admin resets and test fixtures.
   * Do NOT use from operational controllers.
   */
  forceUpdateStatus(patientId: string, status: PatientStatus): Patient | undefined {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === patientId);
    if (patient) {
      patient.status = status;
      patient.updatedAt = new Date().toISOString();
      db.persist();
    }
    return patient;
  }
}

export const patientRepository = new PatientRepository();
