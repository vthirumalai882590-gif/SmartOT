"use strict";
// ==========================================
// SMARTOT COMMAND - WORKFLOW STATE MACHINES
// ==========================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATIENT_STATUS_TRANSITIONS = exports.CSSD_PACK_TRANSITIONS = exports.OT_STATE_TRANSITIONS = void 0;
exports.isValidOTTransition = isValidOTTransition;
exports.isValidCSSDTransition = isValidCSSDTransition;
exports.isValidPatientTransition = isValidPatientTransition;
// Valid OT State Transitions
exports.OT_STATE_TRANSITIONS = {
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
function isValidOTTransition(fromState, toState) {
    if (fromState === toState)
        return true;
    const allowed = exports.OT_STATE_TRANSITIONS[fromState];
    return Boolean(allowed && allowed.includes(toState));
}
// Valid CSSD Pack Lifecycle Transitions
exports.CSSD_PACK_TRANSITIONS = {
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
function isValidCSSDTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return true;
    const allowed = exports.CSSD_PACK_TRANSITIONS[fromStatus];
    return Boolean(allowed && allowed.includes(toStatus));
}
// Valid Patient Journey Status Transitions
exports.PATIENT_STATUS_TRANSITIONS = {
    ADMITTED: ['PREPARING'],
    PREPARING: ['READY_FOR_OT'],
    READY_FOR_OT: ['IN_TRANSFER'],
    IN_TRANSFER: ['IN_OT'],
    IN_OT: ['IN_SURGERY'],
    IN_SURGERY: ['POST_OP'],
    POST_OP: ['DISCHARGED'],
    DISCHARGED: [],
};
function isValidPatientTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return true;
    const allowed = exports.PATIENT_STATUS_TRANSITIONS[fromStatus];
    return Boolean(allowed && allowed.includes(toStatus));
}
