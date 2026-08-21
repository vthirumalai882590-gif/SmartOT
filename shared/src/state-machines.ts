// ==========================================
// SMARTOT COMMAND - WORKFLOW STATE MACHINES
// ==========================================

import { OTState, CSSDPackStatus, PatientStatus } from './types';

// Valid OT State Transitions
export const OT_STATE_TRANSITIONS: Record<OTState, OTState[]> = {
  SCHEDULED: ['PREPARING', 'PATIENT_READY', 'PATIENT_TRANSFER', 'DELAYED'],
  PREPARING: ['PATIENT_READY', 'PATIENT_TRANSFER', 'DELAYED'],
  PATIENT_READY: ['PATIENT_TRANSFER', 'PATIENT_ARRIVED', 'DELAYED'],
  PATIENT_TRANSFER: ['PATIENT_ARRIVED', 'OT_READY', 'DELAYED'],
  PATIENT_ARRIVED: ['OT_READY', 'SURGERY_STARTED', 'DELAYED'],
  OT_READY: ['SURGERY_STARTED', 'DELAYED'],
  SURGERY_STARTED: ['SURGERY_COMPLETED', 'DELAYED'],
  SURGERY_COMPLETED: ['TURNOVER'],
  TURNOVER: ['AVAILABLE', 'PREPARING', 'SCHEDULED', 'DELAYED'],
  AVAILABLE: ['SCHEDULED', 'PREPARING', 'PATIENT_READY', 'PATIENT_TRANSFER'],
  DELAYED: ['PREPARING', 'PATIENT_READY', 'PATIENT_TRANSFER', 'PATIENT_ARRIVED', 'OT_READY', 'SURGERY_STARTED', 'TURNOVER', 'AVAILABLE'],
};

export function isValidOTTransition(fromState: OTState, toState: OTState): boolean {
  if (fromState === toState) return true;
  const allowed = OT_STATE_TRANSITIONS[fromState];
  return Boolean(allowed && allowed.includes(toState));
}

// Valid CSSD Pack & Instrument Lifecycle Transitions
export const CSSD_PACK_TRANSITIONS: Record<CSSDPackStatus, CSSDPackStatus[]> = {
  COLLECTED: ['STERILIZING', 'QUEUED', 'PROCESSING'],
  STERILIZING: ['STERILIZED', 'COMPLETED', 'RELEASE_PENDING', 'REPROCESSING'],
  STERILIZED: ['STORED', 'AVAILABLE', 'STERILE', 'EXPIRED'],
  STORED: ['AVAILABLE', 'STERILE', 'ASSIGNED', 'EXPIRED', 'BLOCKED'],
  STERILE: ['AVAILABLE', 'RESERVED', 'ASSIGNED', 'IN_USE', 'RETURNED_TO_CSSD', 'EXPIRED', 'BLOCKED', 'QUEUED'],
  AVAILABLE: ['STERILE', 'RESERVED', 'ASSIGNED', 'IN_USE', 'RETURNED_TO_CSSD', 'EXPIRED', 'BLOCKED', 'QUEUED'],
  RESERVED: ['ASSIGNED', 'AVAILABLE', 'STERILE'],
  ASSIGNED: ['IN_USE', 'AVAILABLE', 'STERILE', 'RETURNED_TO_CSSD', 'RETURNED'],
  IN_USE: ['RETURNED_TO_CSSD', 'RETURNED'],
  RETURNED: ['RETURNED_TO_CSSD', 'RECEIVED', 'QUEUED', 'REPROCESSING', 'COLLECTED'],
  RETURNED_TO_CSSD: ['RECEIVED', 'QUEUED', 'PROCESSING', 'REPROCESSING', 'COLLECTED'],
  RECEIVED: ['QUEUED', 'PROCESSING'],
  QUEUED: ['PROCESSING', 'REJECTED', 'QUARANTINED'],
  PROCESSING: ['COMPLETED', 'RELEASE_PENDING', 'REJECTED', 'QUARANTINED'],
  COMPLETED: ['RELEASE_PENDING', 'RELEASED', 'REJECTED', 'QUARANTINED'],
  RELEASE_PENDING: ['RELEASED', 'REJECTED', 'QUARANTINED'],
  RELEASED: ['STERILE', 'AVAILABLE', 'STORED'],
  REJECTED: ['QUEUED', 'REPROCESSING', 'COLLECTED', 'RETURNED_TO_CSSD'],
  QUARANTINED: ['QUEUED', 'REPROCESSING', 'COLLECTED'],
  REPROCESSING: ['COLLECTED', 'QUEUED', 'RECEIVED'],
  EXPIRED: ['BLOCKED', 'REPROCESSING', 'QUEUED'],
  BLOCKED: ['REPROCESSING', 'COLLECTED', 'QUEUED'],
};

export function isValidCSSDTransition(fromStatus: CSSDPackStatus, toStatus: CSSDPackStatus): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = CSSD_PACK_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

// Valid Patient Journey Status Transitions
export const PATIENT_STATUS_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  ADMITTED: ['PREPARING', 'READY_FOR_OT', 'IN_TRANSFER'],
  PREPARING: ['READY_FOR_OT', 'ADMITTED', 'IN_TRANSFER'],
  READY_FOR_OT: ['IN_TRANSFER', 'PREPARING'],
  IN_TRANSFER: ['IN_OT'],
  IN_OT: ['IN_SURGERY', 'IN_TRANSFER'],
  IN_SURGERY: ['POST_OP'],
  POST_OP: ['DISCHARGED'],
  DISCHARGED: [],
};

export function isValidPatientTransition(fromStatus: PatientStatus, toStatus: PatientStatus): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = PATIENT_STATUS_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}
