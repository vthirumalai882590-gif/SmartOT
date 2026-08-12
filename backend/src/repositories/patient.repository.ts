import { db } from '../database/db';
import { Patient, PatientReadiness, ConsentStatus, PatientStatus } from '../../../shared/src/types';

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
    readiness.isReady = completed === 6 && readiness.consentStatus === 'VERIFIED';
    readiness.updatedAt = new Date().toISOString();

    // Sync patient status
    const patient = data.patients.find((p) => p.id === patientId);
    if (patient) {
      if (readiness.isReady && patient.status === 'PREPARING') {
        patient.status = 'READY_FOR_OT';
      } else if (!readiness.isReady && patient.status === 'READY_FOR_OT') {
        patient.status = 'PREPARING';
      }
    }

    db.persist();
    return readiness;
  }

  updateConsent(patientId: string, consentStatus: ConsentStatus): PatientReadiness {
    return this.updateReadiness(patientId, { consentStatus });
  }

  updateStatus(patientId: string, status: PatientStatus): Patient | undefined {
    const data = db.getData();
    const patient = data.patients.find((p) => p.id === patientId);
    if (patient) {
      patient.status = status;
      db.persist();
    }
    return patient;
  }
}

export const patientRepository = new PatientRepository();
