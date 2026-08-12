// ==========================================
// SMARTOT COMMAND - WORKFLOW STATE MACHINES
// ==========================================

import { OTState, CSSDPackStatus, PatientStatus } from './types';

// Valid OT State Transitions
export const OT_STATE_TRANSITIONS: Record<OTState, OTState[]> = {
  SCHEDULED: ['PREPARING', 'DELAYED'],
  PREPARING: ['PATIENT_READY', 'DELAYED'],
  PATIENT_READY: ['PATIENT_TRANSFER', 'DELAYED'],
  PATIENT_TRANSFER: ['PATIENT_ARRIVED', 'DELAYED'],
  PATIENT_ARRIVED: ['OT_READY', 'DELAYED'],
  OT_READY: ['SURGERY_STARTED', 'DELAYED'],
  SURGERY_STARTED: ['SURGERY_COMPLETED'],
  SURGERY_COMPLETED: ['TURNOVER'],
  TURNOVER: ['AVAILABLE', 'DELAYED'],
  AVAILABLE: ['SCHEDULED', 'PREPARING'],
  DELAYED: ['PREPARING', 'PATIENT_READY', 'PATIENT_TRANSFER', 'PATIENT_ARRIVED', 'OT_READY', 'SURGERY_STARTED', 'TURNOVER', 'AVAILABLE'],
};

export function isValidOTTransition(fromState: OTState, toState: OTState): boolean {
  if (fromState === toState) return true;
  const allowed = OT_STATE_TRANSITIONS[fromState];
  return Boolean(allowed && allowed.includes(toState));
}

// Valid CSSD Pack Lifecycle Transitions
export const CSSD_PACK_TRANSITIONS: Record<CSSDPackStatus, CSSDPackStatus[]> = {
  COLLECTED: ['STERILIZING'],
  STERILIZING: ['STERILIZED', 'REPROCESSING'],
  STERILIZED: ['STORED', 'EXPIRED'],
  STORED: ['AVAILABLE', 'EXPIRED', 'BLOCKED'],
  AVAILABLE: ['ASSIGNED', 'EXPIRED', 'BLOCKED'],
  ASSIGNED: ['IN_USE', 'AVAILABLE', 'RETURNED'],
  IN_USE: ['RETURNED'],
  RETURNED: ['REPROCESSING', 'COLLECTED'],
  REPROCESSING: ['COLLECTED'],
  EXPIRED: ['BLOCKED', 'REPROCESSING'],
  BLOCKED: ['REPROCESSING', 'COLLECTED'],
};

export function isValidCSSDTransition(fromStatus: CSSDPackStatus, toStatus: CSSDPackStatus): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = CSSD_PACK_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

// Valid Patient Journey Status Transitions
export const PATIENT_STATUS_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  ADMITTED: ['PREPARING'],
  PREPARING: ['READY_FOR_OT'],
  READY_FOR_OT: ['IN_TRANSFER'],
  IN_TRANSFER: ['IN_OT'],
  IN_OT: ['IN_SURGERY'],
  IN_SURGERY: ['POST_OP'],
  POST_OP: ['DISCHARGED'],
  DISCHARGED: [],
};

export function isValidPatientTransition(fromStatus: PatientStatus, toStatus: PatientStatus): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = PATIENT_STATUS_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}
