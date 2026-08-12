// ==========================================
// SMARTOT COMMAND - CONSTANTS & BENCHMARKS
// ==========================================

import { UserRole } from './types';

export const OPERATIONAL_BENCHMARKS = {
  TRANSFER_BENCHMARK_MINUTES: 15,
  TURNOVER_BENCHMARK_MINUTES: 25,
  PREOP_READINESS_BUFFER_MINUTES: 30,
  PACK_EXPIRY_WARNING_HOURS: 48,
  SCHEDULE_DELAY_THRESHOLD_MINUTES: 10,
};

export const DEMO_USERS = [
  {
    id: 'usr_admin_01',
    email: 'admin@smartot.hospital',
    password: 'Admin@123password',
    name: 'Dr. Sarah Jenkins',
    role: 'ADMINISTRATOR' as UserRole,
    department: 'Hospital Administration',
  },
  {
    id: 'usr_ot_01',
    email: 'otmanager@smartot.hospital',
    password: 'OTManager@123password',
    name: 'Marcus Vance, RN',
    role: 'OT_MANAGER' as UserRole,
    department: 'Surgical Suite / OT Operations',
  },
  {
    id: 'usr_cssd_01',
    email: 'cssd@smartot.hospital',
    password: 'CSSDStaff@123password',
    name: 'Elena Rostova',
    role: 'CSSD_STAFF' as UserRole,
    department: 'Central Sterile Services Department',
  },
  {
    id: 'usr_ward_01',
    email: 'ward@smartot.hospital',
    password: 'WardStaff@123password',
    name: 'Nurse David Chen',
    role: 'WARD_STAFF' as UserRole,
    department: 'Pre-Op Inpatient Ward 4B',
  },
];

export const CSSD_PACK_TYPES = [
  'Appendectomy Set',
  'Laparotomy Major Set',
  'Orthopedic Arthroplasty Set',
  'Cardiovascular Basic Set',
  'Neurosurgical Cranial Set',
  'ENT Pediatric Microsurgery Set',
  'Ophthalmic Phaco Set',
  'Trauma Emergency Set',
] as const;

export const OT_ROOMS = [
  { code: 'OT-01', name: 'Operating Theatre 1', specialty: 'General & Laparoscopic Surgery' },
  { code: 'OT-02', name: 'Operating Theatre 2', specialty: 'Orthopedics & Joint Replacement' },
  { code: 'OT-03', name: 'Operating Theatre 3', specialty: 'Emergency & General Surgery' },
  { code: 'OT-04', name: 'Operating Theatre 4', specialty: 'Cardiovascular & Thoracic' },
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMINISTRATOR: [
    'view_command_center',
    'view_ot_schedule',
    'manage_ot_state',
    'view_patients',
    'edit_patients',
    'view_cssd',
    'manage_cssd',
    'scan_cssd',
    'view_alerts',
    'resolve_alerts',
    'view_analytics',
    'view_simulator',
    'use_ai_consultant',
    'view_audit_logs',
    'manage_settings',
  ],
  OT_MANAGER: [
    'view_command_center',
    'view_ot_schedule',
    'manage_ot_state',
    'view_patients',
    'view_cssd',
    'scan_cssd',
    'view_alerts',
    'resolve_alerts',
    'view_analytics',
    'use_ai_consultant',
    'view_simulator',
  ],
  CSSD_STAFF: [
    'view_cssd',
    'manage_cssd',
    'scan_cssd',
    'view_alerts',
    'resolve_alerts',
    'view_analytics',
  ],
  WARD_STAFF: [
    'view_patients',
    'edit_patients',
    'manage_readiness',
    'manage_consent',
    'start_transfer',
    'view_alerts',
  ],
};
