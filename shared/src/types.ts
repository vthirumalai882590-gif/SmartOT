// ==========================================
// SMARTOT COMMAND - SHARED DOMAIN TYPES
// ==========================================

export type UserRole = 'ADMINISTRATOR' | 'OT_MANAGER' | 'CSSD_STAFF' | 'WARD_STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt: string;
}

export type ConsentStatus = 'PENDING' | 'VERIFIED' | 'MISSING';

export interface PatientReadiness {
  id: string;
  patientId: string;
  admissionCompleted: boolean;
  consentStatus: ConsentStatus;
  documentationCompleted: boolean;
  reportsAvailable: boolean;
  doctorConfirmed: boolean;
  preopPrepCompleted: boolean;
  completedItemsCount: number;
  totalItemsCount: number;
  isReady: boolean;
  notes?: string;
  updatedAt: string;
}

export type PatientStatus = 'ADMITTED' | 'PREPARING' | 'READY_FOR_OT' | 'IN_TRANSFER' | 'IN_OT' | 'IN_SURGERY' | 'POST_OP' | 'DISCHARGED';

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  wardId: string;
  bedNumber: string;
  admissionDate: string;
  status: PatientStatus;
  primaryDiagnosis: string;
  readiness?: PatientReadiness;
  activeSurgeryId?: string;
}

export type OTState =
  | 'SCHEDULED'
  | 'PREPARING'
  | 'PATIENT_READY'
  | 'PATIENT_TRANSFER'
  | 'PATIENT_ARRIVED'
  | 'OT_READY'
  | 'SURGERY_STARTED'
  | 'SURGERY_COMPLETED'
  | 'TURNOVER'
  | 'AVAILABLE'
  | 'DELAYED';

export type DelayRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OperatingTheatre {
  id: string;
  code: string; // e.g. OT-01, OT-02, OT-03, OT-04
  name: string;
  specialty: string;
  currentStatus: OTState;
  activeSurgeryId?: string;
  turnoverStartedAt?: string;
  expectedTurnoverMinutes: number;
  currentDelayMinutes: number;
  riskLevel: DelayRiskLevel;
  lastUpdated: string;
}

export type SurgeryStatus = 'SCHEDULED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';

export interface Surgery {
  id: string;
  patientId: string;
  patientName?: string;
  patientMrn?: string;
  otId: string;
  otCode?: string;
  procedureName: string;
  surgeonName: string;
  anesthesiologistName: string;
  requiredPackType: string;
  assignedPackId?: string;
  scheduledStartTime: string;
  expectedDurationMinutes: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDurationMinutes?: number;
  priority?: string;
  status: SurgeryStatus;
  delayMinutes: number;
  delayReason?: string;
  riskLevel: DelayRiskLevel;
  riskReasons?: string[];
  createdAt: string;
}

export type CSSDPackStatus =
  | 'COLLECTED'
  | 'STERILIZING'
  | 'STERILIZED'
  | 'STORED'
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_USE'
  | 'RETURNED'
  | 'REPROCESSING'
  | 'EXPIRED'
  | 'BLOCKED';

export type SterilityStatus = 'STERILIZED' | 'UNSTERILIZED' | 'EXPIRED';

export interface CSSDPack {
  id: string;
  packId: string; // e.g. CSSD-001
  packType: string; // e.g. 'Appendectomy Set', 'Laparotomy Set', 'Orthopedic Major'
  sterilizationBatch: string;
  sterilizedAt: string;
  expiresAt: string;
  sterilityStatus: SterilityStatus;
  currentStatus: CSSDPackStatus;
  currentLocation: string; // e.g. 'CSSD Main Storage', 'OT-03 Anteroom'
  assignedOtId?: string;
  assignedSurgeryId?: string;
  assignedPatientId?: string;
  notes?: string;
  updatedAt: string;
}

export interface QRVerificationResult {
  valid: boolean;
  packId: string;
  pack?: CSSDPack;
  status: 'VERIFIED' | 'BLOCKED';
  message: string;
  reasons: string[];
  suggestedAction?: string;
}

export type WorkflowEventType =
  | 'PATIENT_ADMITTED'
  | 'CONSENT_UPDATED'
  | 'CONSENT_VERIFIED'
  | 'READINESS_CHECKLIST_UPDATED'
  | 'PATIENT_READY'
  | 'TRANSFER_STARTED'
  | 'PATIENT_ARRIVED_OT'
  | 'CSSD_PACK_COLLECTED'
  | 'CSSD_PACK_STERILIZING'
  | 'CSSD_PACK_STERILIZED'
  | 'CSSD_PACK_STORED'
  | 'CSSD_PACK_AVAILABLE'
  | 'CSSD_PACK_SCANNED'
  | 'CSSD_PACK_ASSIGNED'
  | 'CSSD_PACK_IN_USE'
  | 'CSSD_PACK_RETURNED'
  | 'CSSD_PACK_REPROCESSING'
  | 'CSSD_PACK_EXPIRED'
  | 'CSSD_PACK_BLOCKED'
  | 'OT_STATE_CHANGED'
  | 'OT_MANUAL_OVERRIDE'
  | 'OT_DELAY_DETECTED'
  | 'SURGERY_SCHEDULED'
  | 'SURGERY_STARTED'
  | 'SURGERY_COMPLETED'
  | 'TURNOVER_STARTED'
  | 'TURNOVER_COMPLETED'
  | 'TURNOVER_DELAY_DETECTED'
  | 'OT_AVAILABLE'
  | 'ALERT_TRIGGERED'
  | 'ALERT_RESOLVED'
  | 'AI_RECOMMENDATION_GENERATED';

export interface WorkflowEvent {
  id: string;
  eventType: WorkflowEventType;
  entityType: 'PATIENT' | 'OT' | 'SURGERY' | 'CSSD_PACK' | 'TRANSFER' | 'ALERT' | 'SYSTEM';
  entityId: string;
  department: 'ADMISSIONS' | 'WARD' | 'OT' | 'CSSD' | 'ADMIN' | 'SYSTEM' | 'TRANSFER';
  timestamp: string;
  actorId: string;
  actorName: string;
  metadata: Record<string, any>;
  idempotencyKey?: string;
}


export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityType: 'PATIENT' | 'OT' | 'CSSD_PACK' | 'SURGERY';
  entityId: string;
  responsibleRole: UserRole;
  recommendedAction: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PatientTransfer {
  id: string;
  patientId: string;
  surgeryId: string;
  fromWard: string;
  toOtId: string;
  toOtCode?: string;
  transferStartedAt: string;
  patientArrivedAt?: string;
  durationMinutes?: number;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'DELAYED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
}

// Analytics Models
export interface BottleneckItem {
  category: 'PATIENT_TRANSFER' | 'CSSD_AVAILABILITY' | 'TURNOVER' | 'DOCUMENTATION' | 'CONSENT' | 'PREVIOUS_CASE_DELAY';
  name: string;
  percentage: number;
  totalDelayMinutes: number;
  caseCount: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface OTUtilizationMetric {
  otId: string;
  otCode: string;
  otName: string;
  utilizationRate: number; // 0-100
  occupiedMinutes: number;
  availableMinutes: number;
  turnoverMinutes: number;
  idleMinutes: number;
  surgeriesCount: number;
}

export interface CSSDDemandForecast {
  packType: string;
  requiredTomorrow: number;
  availableNow: number;
  inReprocessing: number;
  deficit: number;
  status: 'SUFFICIENT' | 'POTENTIAL_SHORTAGE' | 'CRITICAL_DEFICIT';
  recommendation: string;
}

// Next-Best-Action Engine
export interface NextBestAction {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  department: string;
  action: string;
  rationale: string;
  impactScore: number;
  entityType: string;
  entityId: string;
  actionPayload?: Record<string, any>;
}

// AI Operations Consultant Structured Context
export interface AIOperationsContext {
  hospitalName: string;
  currentTime: string;
  kpis: {
    otUtilization: number;
    activeSurgeries: number;
    readyPatients: number;
    delayedCases: number;
    highRiskCases: number;
    cssdAvailability: number;
  };
  otStatuses: Array<{
    code: string;
    status: OTState;
    currentPatient?: string;
    currentProcedure?: string;
    delayMinutes: number;
    riskLevel: DelayRiskLevel;
  }>;
  activeAlerts: Array<{
    id: string;
    severity: AlertSeverity;
    title: string;
    description: string;
    responsibleRole: UserRole;
  }>;
  recentEvents: Array<{
    eventType: WorkflowEventType;
    timestamp: string;
    summary: string;
  }>;
  bottlenecks: BottleneckItem[];
  nextBestActions: NextBestAction[];
}

export interface AIConsultantResponse {
  summary: string;
  likelyContributors: string[];
  evidence: string[];
  recommendedActions: string[];
  uncertaintyLimitations: string;
  timestamp: string;
}

// What-If Simulator
export interface SimulationParameters {
  turnoverReductionMinutes: number; // e.g. 10m reduction
  transferOptimizationMinutes: number; // e.g. 5m reduction
  prepChecklistAutomationHours: number; // e.g. 1h earlier readiness
}

export interface SimulationResult {
  baselineUtilization: number;
  simulatedUtilization: number;
  utilizationGainPercentage: number;
  savedDelayMinutesPerDay: number;
  additionalCasesCapacityPerWeek: number;
  explanation: string;
  breakdown: {
    turnoverImpactMinutes: number;
    transferImpactMinutes: number;
    readinessImpactMinutes: number;
  };
}

// Offline Synchronization Queue
export interface OfflineSyncQueueItem {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  error?: string;
}
