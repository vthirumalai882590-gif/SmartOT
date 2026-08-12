import bcrypt from 'bcryptjs';
import {
  User,
  Patient,
  PatientReadiness,
  OperatingTheatre,
  Surgery,
  CSSDPack,
  WorkflowEvent,
  Alert,
  PatientTransfer,
  AuditLog,
} from '../../../shared/src/types';
import { DEMO_USERS, CSSD_PACK_TYPES, OT_ROOMS } from '../../../shared/src/constants';

export async function generateSeedData() {
  const salt = bcrypt.genSaltSync(10);

  // 1. Users
  const users: User[] = DEMO_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    createdAt: '2026-08-01T08:00:00Z',
  }));

  // Map password hashes for authentication
  const passwordHashes: Record<string, string> = {
    'admin@smartot.hospital': bcrypt.hashSync('Admin@123password', salt),
    'otmanager@smartot.hospital': bcrypt.hashSync('OTManager@123password', salt),
    'cssd@smartot.hospital': bcrypt.hashSync('CSSDStaff@123password', salt),
    'ward@smartot.hospital': bcrypt.hashSync('WardStaff@123password', salt),
  };

  // 2. Operating Theatres (4 Rooms)
  const operating_theatres: OperatingTheatre[] = [
    {
      id: 'ot_01',
      code: 'OT-01',
      name: 'Operating Theatre 1',
      specialty: 'General & Laparoscopic Surgery',
      currentStatus: 'SURGERY_STARTED',
      activeSurgeryId: 'surg_01',
      expectedTurnoverMinutes: 25,
      currentDelayMinutes: 0,
      riskLevel: 'LOW',
      lastUpdated: '2026-08-11T14:15:00Z',
    },
    {
      id: 'ot_02',
      code: 'OT-02',
      name: 'Operating Theatre 2',
      specialty: 'Orthopedics & Joint Replacement',
      currentStatus: 'AVAILABLE',
      expectedTurnoverMinutes: 25,
      currentDelayMinutes: 0,
      riskLevel: 'LOW',
      lastUpdated: '2026-08-11T13:50:00Z',
    },
    {
      id: 'ot_03',
      code: 'OT-03',
      name: 'Operating Theatre 3',
      specialty: 'Emergency & General Surgery',
      currentStatus: 'PREPARING',
      activeSurgeryId: 'surg_1024',
      expectedTurnoverMinutes: 25,
      currentDelayMinutes: 18,
      riskLevel: 'HIGH',
      lastUpdated: '2026-08-11T14:10:00Z',
    },
    {
      id: 'ot_04',
      code: 'OT-04',
      name: 'Operating Theatre 4',
      specialty: 'Cardiovascular & Thoracic',
      currentStatus: 'TURNOVER',
      turnoverStartedAt: '2026-08-11T13:45:00Z',
      expectedTurnoverMinutes: 25,
      currentDelayMinutes: 8,
      riskLevel: 'MEDIUM',
      lastUpdated: '2026-08-11T14:10:00Z',
    },
  ];

  // 3. Patients (22 Synthetic Patients)
  const patientData = [
    { id: 'pat_1024', mrn: 'MRN-2026-1024', name: 'Arthur Pendelton', age: 48, gender: 'M' as const, wardId: 'Ward 4B', bedNumber: 'Bed 412', diag: 'Acute Appendicitis (Scheduled for Demo Scenario)', surgeryId: 'surg_1024' },
    { id: 'pat_1001', mrn: 'MRN-2026-1001', name: 'Eleanor Sterling', age: 62, gender: 'F' as const, wardId: 'Ward 3A', bedNumber: 'Bed 301', diag: 'Cholecystitis (Laparoscopic Cholecystectomy)', surgeryId: 'surg_01' },
    { id: 'pat_1002', mrn: 'MRN-2026-1002', name: 'Thomas Thorne', age: 54, gender: 'M' as const, wardId: 'Ward 2B', bedNumber: 'Bed 205', diag: 'Right Inguinal Hernia Repair', surgeryId: 'surg_02' },
    { id: 'pat_1003', mrn: 'MRN-2026-1003', name: 'Victoria Zhao', age: 41, gender: 'F' as const, wardId: 'Ward 5C', bedNumber: 'Bed 510', diag: 'Total Knee Arthroplasty', surgeryId: 'surg_03' },
    { id: 'pat_1004', mrn: 'MRN-2026-1004', name: 'James Montgomery', age: 67, gender: 'M' as const, wardId: 'Ward 5A', bedNumber: 'Bed 502', diag: 'Coronary Artery Bypass Graft (CABG)', surgeryId: 'surg_04' },
    { id: 'pat_1005', mrn: 'MRN-2026-1005', name: 'Sophia Al-Mansoor', age: 35, gender: 'F' as const, wardId: 'Ward 4A', bedNumber: 'Bed 408', diag: 'Thyroid Lobectomy', surgeryId: 'surg_05' },
    { id: 'pat_1006', mrn: 'MRN-2026-1006', name: 'Liam O’Connor', age: 29, gender: 'M' as const, wardId: 'Ward 2A', bedNumber: 'Bed 214', diag: 'Anterior Cruciate Ligament (ACL) Reconstruction', surgeryId: 'surg_06' },
    { id: 'pat_1007', mrn: 'MRN-2026-1007', name: 'Chloe Dubois', age: 51, gender: 'F' as const, wardId: 'Ward 3B', bedNumber: 'Bed 318', diag: 'Umbilical Hernia Repair', surgeryId: 'surg_07' },
    { id: 'pat_1008', mrn: 'MRN-2026-1008', name: 'Marcus Brody', age: 58, gender: 'M' as const, wardId: 'Ward 5B', bedNumber: 'Bed 520', diag: 'Lumbar Laminectomy', surgeryId: 'surg_08' },
    { id: 'pat_1009', mrn: 'MRN-2026-1009', name: 'Aaliyah Khan', age: 44, gender: 'F' as const, wardId: 'Ward 4B', bedNumber: 'Bed 415', diag: 'Laparoscopic Hysterectomy', surgeryId: 'surg_09' },
    { id: 'pat_1010', mrn: 'MRN-2026-1010', name: 'Benjamin Hayes', age: 72, gender: 'M' as const, wardId: 'Ward 3A', bedNumber: 'Bed 306', diag: 'Transurethral Resection of Prostate (TURP)', surgeryId: 'surg_10' },
    { id: 'pat_1011', mrn: 'MRN-2026-1011', name: 'Grace Nakamura', age: 38, gender: 'F' as const, wardId: 'Ward 4A', bedNumber: 'Bed 402', diag: 'Endoscopic Sinus Surgery (FESS)', surgeryId: 'surg_11' },
    { id: 'pat_1012', mrn: 'MRN-2026-1012', name: 'Daniel Ross', age: 60, gender: 'M' as const, wardId: 'Ward 5C', bedNumber: 'Bed 514', diag: 'Total Hip Replacement', surgeryId: 'surg_12' },
    { id: 'pat_1013', mrn: 'MRN-2026-1013', name: 'Isabella Rossi', age: 49, gender: 'F' as const, wardId: 'Ward 2B', bedNumber: 'Bed 208', diag: 'Mastectomy with Sentinel Node Biopsy', surgeryId: 'surg_13' },
    { id: 'pat_1014', mrn: 'MRN-2026-1014', name: 'Ethan Wright', age: 33, gender: 'M' as const, wardId: 'Ward 4B', bedNumber: 'Bed 422', diag: 'Open Appendectomy', surgeryId: 'surg_14' },
    { id: 'pat_1015', mrn: 'MRN-2026-1015', name: 'Maya Patel', age: 56, gender: 'F' as const, wardId: 'Ward 3B', bedNumber: 'Bed 312', diag: 'Carotid Endarterectomy', surgeryId: 'surg_15' },
    { id: 'pat_1016', mrn: 'MRN-2026-1016', name: 'Lucas Silva', age: 24, gender: 'M' as const, wardId: 'Ward 2A', bedNumber: 'Bed 218', diag: 'Shoulder Arthroscopy', surgeryId: 'surg_16' },
    { id: 'pat_1017', mrn: 'MRN-2026-1017', name: 'Zoe Washington', age: 69, gender: 'F' as const, wardId: 'Ward 5A', bedNumber: 'Bed 508', diag: 'Aortic Valve Replacement', surgeryId: 'surg_17' },
    { id: 'pat_1018', mrn: 'MRN-2026-1018', name: 'Henry Cavendish', age: 75, gender: 'M' as const, wardId: 'Ward 3A', bedNumber: 'Bed 315', diag: 'Femoral-Popliteal Bypass', surgeryId: 'surg_18' },
    { id: 'pat_1019', mrn: 'MRN-2026-1019', name: 'Amelia Earhart', age: 46, gender: 'F' as const, wardId: 'Ward 4C', bedNumber: 'Bed 430', diag: 'Cataract Phacoemulsification', surgeryId: 'surg_19' },
    { id: 'pat_1020', mrn: 'MRN-2026-1020', name: 'Oliver Twist', age: 31, gender: 'M' as const, wardId: 'Ward 2B', bedNumber: 'Bed 220', diag: 'Laparoscopic Appendectomy', surgeryId: 'surg_20' },
  ];

  const patients: Patient[] = [];
  const patient_readiness: PatientReadiness[] = [];

  patientData.forEach((p, idx) => {
    // For P-1024 (Demo scenario target), set consent MISSING initially
    const isTarget = p.id === 'pat_1024';
    const consentStatus = isTarget ? 'MISSING' : idx % 7 === 0 ? 'PENDING' : 'VERIFIED';
    const admissionDone = true;
    const docDone = !isTarget && idx % 9 !== 0;
    const reportsDone = true;
    const docConfirmed = !isTarget;
    const preopDone = !isTarget;

    const completedCount =
      (admissionDone ? 1 : 0) +
      (consentStatus === 'VERIFIED' ? 1 : 0) +
      (docDone ? 1 : 0) +
      (reportsDone ? 1 : 0) +
      (docConfirmed ? 1 : 0) +
      (preopDone ? 1 : 0);

    const isReady = completedCount === 6;

    patients.push({
      id: p.id,
      mrn: p.mrn,
      name: p.name,
      age: p.age,
      gender: p.gender,
      wardId: p.wardId,
      bedNumber: p.bedNumber,
      admissionDate: '2026-08-11T07:30:00Z',
      status: isTarget ? 'PREPARING' : isReady ? 'READY_FOR_OT' : 'PREPARING',
      primaryDiagnosis: p.diag,
      activeSurgeryId: p.surgeryId,
    });

    patient_readiness.push({
      id: `readiness_${p.id}`,
      patientId: p.id,
      admissionCompleted: admissionDone,
      consentStatus: consentStatus,
      documentationCompleted: docDone,
      reportsAvailable: reportsDone,
      doctorConfirmed: docConfirmed,
      preopPrepCompleted: preopDone,
      completedItemsCount: completedCount,
      totalItemsCount: 6,
      isReady: isReady,
      notes: isTarget ? 'Awaiting surgical consent confirmation from ward attending' : 'Pre-op checklist verification in progress',
      updatedAt: '2026-08-11T13:40:00Z',
    });
  });

  // 4. Surgeries (21 Surgeries linked to OTs and Patients)
  const surgeries: Surgery[] = [
    {
      id: 'surg_1024',
      patientId: 'pat_1024',
      patientName: 'Arthur Pendelton',
      patientMrn: 'MRN-2026-1024',
      otId: 'ot_03',
      otCode: 'OT-03',
      procedureName: 'Emergency Appendectomy',
      surgeonName: 'Dr. Robert Martinez',
      anesthesiologistName: 'Dr. Clara Oswald',
      requiredPackType: 'Appendectomy Set',
      scheduledStartTime: '2026-08-11T14:00:00Z',
      expectedDurationMinutes: 60,
      status: 'SCHEDULED',
      delayMinutes: 18,
      delayReason: 'Missing patient surgical consent and delayed pre-op checklist completion in Ward 4B',
      riskLevel: 'HIGH',
      riskReasons: [
        'Surgical consent status currently MISSING',
        'Patient readiness checklist is 5/6 (Incomplete)',
        'Scheduled OT start time has elapsed by 18 minutes',
      ],
      createdAt: '2026-08-11T08:00:00Z',
    },
    {
      id: 'surg_01',
      patientId: 'pat_1001',
      patientName: 'Eleanor Sterling',
      patientMrn: 'MRN-2026-1001',
      otId: 'ot_01',
      otCode: 'OT-01',
      procedureName: 'Laparoscopic Cholecystectomy',
      surgeonName: 'Dr. Alan Grant',
      anesthesiologistName: 'Dr. Ian Malcolm',
      requiredPackType: 'Laparotomy Major Set',
      assignedPackId: 'CSSD-004',
      scheduledStartTime: '2026-08-11T13:30:00Z',
      actualStartTime: '2026-08-11T13:35:00Z',
      expectedDurationMinutes: 75,
      status: 'IN_PROGRESS',
      delayMinutes: 5,
      riskLevel: 'LOW',
      createdAt: '2026-08-11T08:00:00Z',
    },
    {
      id: 'surg_02',
      patientId: 'pat_1002',
      patientName: 'Thomas Thorne',
      patientMrn: 'MRN-2026-1002',
      otId: 'ot_01',
      otCode: 'OT-01',
      procedureName: 'Right Inguinal Hernia Repair',
      surgeonName: 'Dr. Alan Grant',
      anesthesiologistName: 'Dr. Ian Malcolm',
      requiredPackType: 'Laparotomy Major Set',
      scheduledStartTime: '2026-08-11T15:30:00Z',
      expectedDurationMinutes: 60,
      status: 'SCHEDULED',
      delayMinutes: 0,
      riskLevel: 'LOW',
      createdAt: '2026-08-11T08:00:00Z',
    },
    {
      id: 'surg_03',
      patientId: 'pat_1003',
      patientName: 'Victoria Zhao',
      patientMrn: 'MRN-2026-1003',
      otId: 'ot_02',
      otCode: 'OT-02',
      procedureName: 'Total Knee Arthroplasty',
      surgeonName: 'Dr. Gregory House',
      anesthesiologistName: 'Dr. Lisa Cuddy',
      requiredPackType: 'Orthopedic Arthroplasty Set',
      scheduledStartTime: '2026-08-11T14:30:00Z',
      expectedDurationMinutes: 110,
      status: 'READY',
      delayMinutes: 0,
      riskLevel: 'LOW',
      createdAt: '2026-08-11T08:00:00Z',
    },
    {
      id: 'surg_04',
      patientId: 'pat_1004',
      patientName: 'James Montgomery',
      patientMrn: 'MRN-2026-1004',
      otId: 'ot_04',
      otCode: 'OT-04',
      procedureName: 'Coronary Artery Bypass Graft (CABG)',
      surgeonName: 'Dr. Cristina Yang',
      anesthesiologistName: 'Dr. Derek Shepherd',
      requiredPackType: 'Cardiovascular Basic Set',
      scheduledStartTime: '2026-08-11T15:00:00Z',
      expectedDurationMinutes: 180,
      status: 'SCHEDULED',
      delayMinutes: 12,
      delayReason: 'Turnover in OT-04 running over benchmark by 12 minutes',
      riskLevel: 'MEDIUM',
      riskReasons: ['OT-04 turnover delayed past 25-minute benchmark', 'Cascading schedule push for subsequent case'],
      createdAt: '2026-08-11T08:00:00Z',
    },
    {
      id: 'surg_05',
      patientId: 'pat_1005',
      patientName: 'Sophia Al-Mansoor',
      patientMrn: 'MRN-2026-1005',
      otId: 'ot_03',
      otCode: 'OT-03',
      procedureName: 'Thyroid Lobectomy',
      surgeonName: 'Dr. Robert Martinez',
      anesthesiologistName: 'Dr. Clara Oswald',
      requiredPackType: 'Laparotomy Major Set',
      scheduledStartTime: '2026-08-11T16:00:00Z',
      expectedDurationMinutes: 70,
      status: 'SCHEDULED',
      delayMinutes: 20,
      riskLevel: 'MEDIUM',
      riskReasons: ['Downstream delay inherited from earlier case (P-1024) in OT-03'],
      createdAt: '2026-08-11T08:00:00Z',
    },
  ];

  // 5. CSSD Instrument Packs (32 Packs with QR identifiers)
  const cssd_packs: CSSDPack[] = [
    // Target Pack for Demo Scenario
    {
      id: 'pack_021',
      packId: 'CSSD-021',
      packType: 'Appendectomy Set',
      sterilizationBatch: 'BATCH-20260810-03',
      sterilizedAt: '2026-08-10T11:00:00Z',
      expiresAt: '2026-08-24T11:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'AVAILABLE',
      currentLocation: 'CSSD Sterile Storage Shelf A-3',
      notes: 'Passed biological and chemical indicator verification',
      updatedAt: '2026-08-10T11:30:00Z',
    },
    // Expired Pack for Error/Validation testing
    {
      id: 'pack_099',
      packId: 'CSSD-099',
      packType: 'Appendectomy Set',
      sterilizationBatch: 'BATCH-20260715-01',
      sterilizedAt: '2026-07-15T09:00:00Z',
      expiresAt: '2026-07-29T09:00:00Z', // Expired!
      sterilityStatus: 'EXPIRED',
      currentStatus: 'EXPIRED',
      currentLocation: 'CSSD Quarantine Area',
      notes: 'Expired sterile barrier pack. Reprocessing required.',
      updatedAt: '2026-08-01T09:00:00Z',
    },
    // Unsterilized/Reprocessing Pack
    {
      id: 'pack_044',
      packId: 'CSSD-044',
      packType: 'Laparotomy Major Set',
      sterilizationBatch: 'BATCH-20260811-09',
      sterilizedAt: '2026-08-11T13:00:00Z',
      expiresAt: '2026-08-25T13:00:00Z',
      sterilityStatus: 'UNSTERILIZED',
      currentStatus: 'STERILIZING',
      currentLocation: 'Autoclave Chamber #2',
      notes: 'Undergoing 134°C steam sterilization cycle',
      updatedAt: '2026-08-11T13:30:00Z',
    },
    {
      id: 'pack_001',
      packId: 'CSSD-001',
      packType: 'Laparotomy Major Set',
      sterilizationBatch: 'BATCH-20260810-01',
      sterilizedAt: '2026-08-10T08:00:00Z',
      expiresAt: '2026-08-24T08:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'AVAILABLE',
      currentLocation: 'CSSD Main Storage Shelf B-1',
      updatedAt: '2026-08-10T08:45:00Z',
    },
    {
      id: 'pack_002',
      packId: 'CSSD-002',
      packType: 'Orthopedic Arthroplasty Set',
      sterilizationBatch: 'BATCH-20260810-02',
      sterilizedAt: '2026-08-10T09:30:00Z',
      expiresAt: '2026-08-24T09:30:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'STORED',
      currentLocation: 'CSSD Main Storage Shelf C-2',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'pack_003',
      packId: 'CSSD-003',
      packType: 'Cardiovascular Basic Set',
      sterilizationBatch: 'BATCH-20260809-04',
      sterilizedAt: '2026-08-09T14:00:00Z',
      expiresAt: '2026-08-23T14:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'AVAILABLE',
      currentLocation: 'CSSD Main Storage Shelf D-1',
      updatedAt: '2026-08-09T14:30:00Z',
    },
    {
      id: 'pack_004',
      packId: 'CSSD-004',
      packType: 'Laparotomy Major Set',
      sterilizationBatch: 'BATCH-20260810-01',
      sterilizedAt: '2026-08-10T08:00:00Z',
      expiresAt: '2026-08-24T08:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'IN_USE',
      currentLocation: 'OT-01 Sterile Field',
      assignedOtId: 'ot_01',
      assignedSurgeryId: 'surg_01',
      updatedAt: '2026-08-11T13:30:00Z',
    },
    {
      id: 'pack_005',
      packId: 'CSSD-005',
      packType: 'Appendectomy Set',
      sterilizationBatch: 'BATCH-20260810-03',
      sterilizedAt: '2026-08-10T11:00:00Z',
      expiresAt: '2026-08-24T11:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'STORED',
      currentLocation: 'CSSD Main Storage Shelf A-2',
      updatedAt: '2026-08-10T11:45:00Z',
    },
    {
      id: 'pack_006',
      packId: 'CSSD-006',
      packType: 'Orthopedic Arthroplasty Set',
      sterilizationBatch: 'BATCH-20260811-01',
      sterilizedAt: '2026-08-11T06:00:00Z',
      expiresAt: '2026-08-25T06:00:00Z',
      sterilityStatus: 'STERILIZED',
      currentStatus: 'AVAILABLE',
      currentLocation: 'CSSD Main Storage Shelf C-1',
      updatedAt: '2026-08-11T06:40:00Z',
    },
  ];

  // Populate remaining packs up to 32
  const typesList = [...CSSD_PACK_TYPES];
  for (let i = 7; i <= 32; i++) {
    const pad = i.toString().padStart(3, '0');
    const packType = typesList[i % typesList.length];
    const isReproc = i % 5 === 0;
    const isSterilizing = i % 6 === 0;

    cssd_packs.push({
      id: `pack_${pad}`,
      packId: `CSSD-${pad}`,
      packType: packType,
      sterilizationBatch: `BATCH-20260810-${(i % 5) + 1}`,
      sterilizedAt: '2026-08-10T08:00:00Z',
      expiresAt: '2026-08-24T08:00:00Z',
      sterilityStatus: isReproc ? 'UNSTERILIZED' : 'STERILIZED',
      currentStatus: isReproc ? 'REPROCESSING' : isSterilizing ? 'STERILIZING' : 'AVAILABLE',
      currentLocation: isReproc ? 'CSSD Decontamination Bay' : 'CSSD Main Storage',
      updatedAt: '2026-08-11T08:00:00Z',
    });
  }

  // 6. Active Alerts (Operational Warnings)
  const alerts: Alert[] = [
    {
      id: 'alt_01',
      severity: 'CRITICAL',
      title: 'Missing Surgical Consent: Patient P-1024',
      description: 'Scheduled surgery "Emergency Appendectomy" in OT-03 is 18m past schedule start with Consent MISSING in Ward 4B.',
      entityType: 'PATIENT',
      entityId: 'pat_1024',
      responsibleRole: 'WARD_STAFF',
      recommendedAction: 'Verify patient/surrogate consent immediately in Pre-Op Ward 4B or alert attending surgeon.',
      status: 'OPEN',
      createdAt: '2026-08-11T13:45:00Z',
    },
    {
      id: 'alt_02',
      severity: 'WARNING',
      title: 'Turnover Benchmark Overrun: OT-04',
      description: 'Room turnover in OT-04 has exceeded the 25-minute benchmark by 12 minutes, placing CABG case (surg_04) at delay risk.',
      entityType: 'OT',
      entityId: 'ot_04',
      responsibleRole: 'OT_MANAGER',
      recommendedAction: 'Dispatch auxiliary environmental services team to accelerate terminal disinfection.',
      status: 'OPEN',
      createdAt: '2026-08-11T14:02:00Z',
    },
    {
      id: 'alt_03',
      severity: 'INFO',
      title: 'CSSD Demand Advisory: Appendectomy Sets',
      description: 'Tomorrow has 8 scheduled appendectomy procedures with only 5 sets currently sterilized and available.',
      entityType: 'CSSD_PACK',
      entityId: 'Appendectomy Set',
      responsibleRole: 'CSSD_STAFF',
      recommendedAction: 'Prioritize sterilization batch #4 for incoming decontaminated appendectomy trays.',
      status: 'OPEN',
      createdAt: '2026-08-11T12:00:00Z',
    },
  ];

  // 7. Workflow Events (Correlated Event Stream)
  const workflow_events: WorkflowEvent[] = [
    {
      id: 'evt_001',
      eventType: 'PATIENT_ADMITTED',
      entityType: 'PATIENT',
      entityId: 'pat_1024',
      department: 'ADMISSIONS',
      timestamp: '2026-08-11T07:30:00Z',
      actorId: 'usr_ward_01',
      actorName: 'Nurse David Chen',
      metadata: { mrn: 'MRN-2026-1024', ward: 'Ward 4B', diagnosis: 'Acute Appendicitis' },
    },
    {
      id: 'evt_002',
      eventType: 'SURGERY_SCHEDULED',
      entityType: 'SURGERY',
      entityId: 'surg_1024',
      department: 'OT',
      timestamp: '2026-08-11T08:00:00Z',
      actorId: 'usr_ot_01',
      actorName: 'Marcus Vance, RN',
      metadata: { otCode: 'OT-03', scheduledStartTime: '2026-08-11T14:00:00Z', requiredPack: 'Appendectomy Set' },
    },
    {
      id: 'evt_003',
      eventType: 'CSSD_PACK_STERILIZED',
      entityType: 'CSSD_PACK',
      entityId: 'CSSD-021',
      department: 'CSSD',
      timestamp: '2026-08-10T11:00:00Z',
      actorId: 'usr_cssd_01',
      actorName: 'Elena Rostova',
      metadata: { batch: 'BATCH-20260810-03', packType: 'Appendectomy Set', expiry: '2026-08-24T11:00:00Z' },
    },
    {
      id: 'evt_004',
      eventType: 'ALERT_TRIGGERED',
      entityType: 'ALERT',
      entityId: 'alt_01',
      department: 'SYSTEM',
      timestamp: '2026-08-11T13:45:00Z',
      actorId: 'system',
      actorName: 'SmartOT Alert Engine',
      metadata: { patientId: 'pat_1024', triggerReason: 'Consent MISSING 15m prior to scheduled OT start' },
    },
    {
      id: 'evt_005',
      eventType: 'SURGERY_STARTED',
      entityType: 'SURGERY',
      entityId: 'surg_01',
      department: 'OT',
      timestamp: '2026-08-11T13:35:00Z',
      actorId: 'usr_ot_01',
      actorName: 'Marcus Vance, RN',
      metadata: { otCode: 'OT-01', patientId: 'pat_1001', packId: 'CSSD-004' },
    },
    {
      id: 'evt_006',
      eventType: 'TURNOVER_STARTED',
      entityType: 'OT',
      entityId: 'ot_04',
      department: 'OT',
      timestamp: '2026-08-11T13:45:00Z',
      actorId: 'usr_ot_01',
      actorName: 'Marcus Vance, RN',
      metadata: { expectedMinutes: 25 },
    },
    {
      id: 'evt_007',
      eventType: 'TURNOVER_DELAY_DETECTED',
      entityType: 'OT',
      entityId: 'ot_04',
      department: 'SYSTEM',
      timestamp: '2026-08-11T14:10:00Z',
      actorId: 'system',
      actorName: 'SmartOT Delay Engine',
      metadata: { delayMinutes: 12, cause: 'TURNOVER_OVERRUN' },
    },
  ];

  // 8. Transfers
  const transfers: PatientTransfer[] = [
    {
      id: 'trf_01',
      patientId: 'pat_1001',
      surgeryId: 'surg_01',
      fromWard: 'Ward 3A',
      toOtId: 'ot_01',
      toOtCode: 'OT-01',
      transferStartedAt: '2026-08-11T13:10:00Z',
      patientArrivedAt: '2026-08-11T13:22:00Z',
      durationMinutes: 12,
      status: 'COMPLETED',
    },
  ];

  // 9. Audit Logs
  const audit_logs: AuditLog[] = [
    {
      id: 'aud_01',
      timestamp: '2026-08-11T08:00:00Z',
      actorId: 'usr_admin_01',
      actorName: 'Dr. Sarah Jenkins',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      entityId: 'smartot_core',
      previousState: null,
      newState: { status: 'INITIALIZED', seedVersion: '1.0.0' },
      ipAddress: '127.0.0.1',
    },
    {
      id: 'aud_02',
      timestamp: '2026-08-11T08:05:00Z',
      actorId: 'usr_ot_01',
      actorName: 'Marcus Vance, RN',
      action: 'OT_SCHEDULE_PUBLISHED',
      entityType: 'OT_SCHEDULE',
      entityId: 'schedule_20260811',
      previousState: null,
      newState: { caseCount: 6, otCount: 4 },
      ipAddress: '10.0.4.12',
    },
  ];

  return {
    users,
    passwordHashes,
    operating_theatres,
    patients,
    patient_readiness,
    surgeries,
    cssd_packs,
    alerts,
    workflow_events,
    transfers,
    audit_logs,
  };
}
