import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { dashboardController } from '../controllers/dashboard.controller';
import { patientController } from '../controllers/patient.controller';
import { otController } from '../controllers/ot.controller';
import { cssdController } from '../controllers/cssd.controller';
import { transferController } from '../controllers/transfer.controller';
import { alertController } from '../controllers/alert.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { aiController } from '../controllers/ai.controller';
import { auditController } from '../controllers/audit.controller';
import { syncController } from '../controllers/sync.controller';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';


const router = Router();

// ==========================================
// 1. Authentication Routes (Public + Me)
// ==========================================
router.post('/auth/login', (req, res) => authController.login(req, res));
router.get('/auth/me', authenticate, (req, res) => authController.getMe(req, res));

// ==========================================
// 2. Command Center Hero Dashboard
// ==========================================
router.get('/dashboard/command-center', authenticate, (req, res) =>
  dashboardController.getCommandCenter(req, res)
);

// ==========================================
// 3. Patients & Readiness Checklist
// ==========================================
router.get('/patients', authenticate, (req, res) => patientController.getPatients(req, res));
router.get('/patients/:id', authenticate, (req, res) => patientController.getPatientById(req, res));
router.post(
  '/patients/:id/readiness',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER', 'WARD_STAFF'),
  (req, res) => patientController.updateReadiness(req, res)
);
router.post(
  '/patients/:id/consent',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER', 'WARD_STAFF'),
  (req, res) => patientController.updateConsent(req, res)
);

// ==========================================
// 4. Operating Theatres & Surgeries
// ==========================================
router.get('/ot/schedule', authenticate, (req, res) => otController.getSchedule(req, res));
router.get('/ot/:id/timeline', authenticate, (req, res) => otController.getOTTimeline(req, res));
router.post(
  '/ot/schedule-case',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER'),
  (req, res) => otController.scheduleCase(req, res)
);
router.post(
  '/ot/:id/transition',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER'),
  (req, res) => otController.transitionOTState(req, res)
);


// ==========================================
// 5. Patient Transfers
// ==========================================
router.get('/transfers', authenticate, (req, res) => transferController.getTransfers(req, res));
router.post(
  '/transfers/start',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER', 'WARD_STAFF'),
  (req, res) => transferController.startTransfer(req, res)
);
router.post(
  '/transfers/arrive',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER'),
  (req, res) => transferController.arrivePatient(req, res)
);

// ==========================================
// 6. CSSD Sterile Packs & QR Verification
// ==========================================
router.get('/cssd/packs', authenticate, (req, res) => cssdController.getPacks(req, res));
router.post(
  '/cssd/scan',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER', 'CSSD_STAFF'),
  (req, res) => cssdController.scanAndVerifyQR(req, res)
);
router.post(
  '/cssd/packs/:id/transition',
  authenticate,
  authorize('ADMINISTRATOR', 'CSSD_STAFF'),
  (req, res) => cssdController.transitionPackStatus(req, res)
);

// ==========================================
// 7. Operational Alerts
// ==========================================
router.get('/alerts', authenticate, (req, res) => alertController.getAlerts(req, res));
router.patch(
  '/alerts/:id',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER', 'CSSD_STAFF', 'WARD_STAFF'),
  (req, res) => alertController.updateAlertStatus(req, res)
);

// ==========================================
// 8. Analytics, Bottlenecks & Simulator
// ==========================================
router.get('/analytics/bottlenecks', authenticate, (req, res) =>
  analyticsController.getBottlenecks(req, res)
);
router.get('/analytics/utilization', authenticate, (req, res) =>
  analyticsController.getUtilization(req, res)
);
router.get('/analytics/cssd-demand', authenticate, (req, res) =>
  analyticsController.getCSSDDemand(req, res)
);
router.get('/analytics/next-best-actions', authenticate, (req, res) =>
  analyticsController.getNextBestActions(req, res)
);
router.get('/analytics/surgeries/:id/root-cause', authenticate, (req, res) =>
  analyticsController.getSurgeryRootCause(req, res)
);
router.post('/simulation/what-if', authenticate, (req, res) =>
  analyticsController.simulateWhatIf(req, res)
);

// ==========================================
// 9. AI Operations Consultant
// ==========================================
router.post(
  '/ai/consultant/ask',
  authenticate,
  authorize('ADMINISTRATOR', 'OT_MANAGER'),
  (req, res) => aiController.askConsultant(req, res)
);
router.get('/ai/context', authenticate, (req, res) => aiController.getContext(req, res));

// ==========================================
// 10. Audit Trail & Workflow Events Log
// ==========================================
router.get(
  '/audit-logs',
  authenticate,
  authorize('ADMINISTRATOR'),
  (req, res) => auditController.getLogs(req, res)
);
router.get('/events', authenticate, (req, res) => auditController.getEvents(req, res));

// ==========================================
// 11. Offline-First Event Synchronization
// ==========================================
router.post('/sync/events', authenticate, (req, res) => syncController.syncEvents(req, res));

// ==========================================
// 12. Admin Settings & Master Data Management
// ==========================================
router.get('/admin/settings', authenticate, (req, res) => adminController.getSettings(req, res));
router.patch('/admin/settings', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.updateSettings(req, res));

router.get('/admin/ots', authenticate, (req, res) => adminController.getOTs(req, res));
router.post('/admin/ots', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.createOT(req, res));
router.patch('/admin/ots/:id', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.updateOT(req, res));
router.post('/admin/ots/:id/archive', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.archiveOT(req, res));

router.get('/admin/cssd/packs', authenticate, (req, res) => adminController.getCSSDPacks(req, res));
router.post('/admin/cssd/packs', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.createCSSDPack(req, res));
router.patch('/admin/cssd/packs/:id', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.updateCSSDPack(req, res));
router.post('/admin/cssd/packs/:id/archive', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.archiveCSSDPack(req, res));

router.get('/admin/patients', authenticate, (req, res) => adminController.getPatients(req, res));
router.post('/admin/patients', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.createPatient(req, res));
router.patch('/admin/patients/:id', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.updatePatient(req, res));
router.post('/admin/patients/:id/archive', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.archivePatient(req, res));

router.get('/admin/users', authenticate, (req, res) => adminController.getUsers(req, res));
router.post('/admin/users', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.createUser(req, res));
router.patch('/admin/users/:id', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.updateUser(req, res));

router.get('/admin/data-stats', authenticate, (req, res) => adminController.getDataStats(req, res));
router.get('/admin/export/:entity', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.exportData(req, res));
router.post('/admin/reset-demo', authenticate, authorize('ADMINISTRATOR'), (req, res) => adminController.resetDemoData(req, res));
router.get('/admin/system-health', authenticate, (req, res) => adminController.getSystemHealth(req, res));


export default router;

