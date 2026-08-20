import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../stores/auth.store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';
import {
  Settings,
  Building2,
  Users,
  Layers,
  Activity,
  CalendarClock,
  UserPlus,
  PackageCheck,
  Stethoscope,
  Sliders,
  BellRing,
  Bot,
  Bell,
  Database,
  ShieldCheck,
  HeartPulse,
  Search,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  Info,
  Lock,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

// Define the 15+ navigation sections
type SettingsSection =
  | 'general'
  | 'hospital'
  | 'users'
  | 'departments'
  | 'ots'
  | 'schedules'
  | 'patients'
  | 'admissions'
  | 'cssd'
  | 'procedures'
  | 'workflow'
  | 'alerts'
  | 'ai'
  | 'notifications'
  | 'data-management'
  | 'audit'
  | 'security'
  | 'health';

interface NavGroup {
  group: string;
  items: { id: SettingsSection; label: string; icon: React.ElementType; badge?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Organization & Access',
    items: [
      { id: 'general', label: 'General Settings', icon: Settings },
      { id: 'hospital', label: 'Hospital Profile', icon: Building2 },
      { id: 'users', label: 'Users & Roles (RBAC)', icon: Users, badge: 'Active' },
      { id: 'departments', label: 'Departments & Wards', icon: Layers },
    ],
  },
  {
    group: 'Clinical Master Data',
    items: [
      { id: 'ots', label: 'Operating Theatres', icon: Activity },
      { id: 'patients', label: 'Patients & Readiness', icon: UserPlus },
      { id: 'cssd', label: 'CSSD Sterile Packs', icon: PackageCheck },
      { id: 'procedures', label: 'Surgical Procedures', icon: Stethoscope },
      { id: 'schedules', label: 'OT Schedules', icon: CalendarClock },
    ],
  },
  {
    group: 'Workflow & Automation Rules',
    items: [
      { id: 'workflow', label: 'Workflow Stages', icon: Sliders },
      { id: 'alerts', label: 'Alert Engine Rules', icon: BellRing },
      { id: 'ai', label: 'AI Operations Config', icon: Bot, badge: 'Advisory' },
      { id: 'notifications', label: 'Notification Channels', icon: Bell },
    ],
  },
  {
    group: 'Enterprise Data & Governance',
    items: [
      { id: 'data-management', label: 'Data Management Center', icon: Database, badge: 'Core' },
      { id: 'security', label: 'Security & Permissions', icon: ShieldCheck },
      { id: 'health', label: 'System Health & Engine', icon: HeartPulse },
    ],
  },
];

export const SettingsPage: React.FC = () => {
  const { user, quickLoginAs } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const [isPermissionDeniedModalOpen, setIsPermissionDeniedModalOpen] = useState(false);
  const [restrictedActionName, setRestrictedActionName] = useState('');

  const requireAdmin = (actionName: string, actionFn: () => void) => {
    if (!isAdmin) {
      setRestrictedActionName(actionName);
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    actionFn();
  };

  const [activeSection, setActiveSection] = useState<SettingsSection>('data-management');
  const [navSearch, setNavSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  // General Settings State
  const [settings, setSettings] = useState<any>({
    hospitalName: 'SmartOT Command Central Hospital',
    hospitalCode: 'HOSP-BLR-01',
    timezone: 'Asia/Kolkata',
    otDelayWarningMinutes: 10,
    otDelayCriticalMinutes: 20,
    turnoverWarningMinutes: 30,
    transferWarningMinutes: 15,
    aiEnabled: true,
    aiRiskPredictionEnabled: true,
    aiRecommendationsEnabled: true,
    aiConfidenceThreshold: 70,
    consentRequired: true,
    documentationRequired: true,
    preopPrepRequired: true,
    alertRules: {
      consentMissing: { enabled: true, severity: 'CRITICAL', thresholdMinutes: 30 },
      packUnavailable: { enabled: true, severity: 'CRITICAL', thresholdMinutes: 0 },
      transferNotStarted: { enabled: true, severity: 'WARNING', thresholdMinutes: 15 },
      turnoverDelay: { enabled: true, severity: 'WARNING', thresholdMinutes: 30 },
      otDelay: { enabled: true, severity: 'WARNING', thresholdMinutes: 10 },
    },
    notifications: { inApp: true, email: false, sms: false, push: false },
  });

  // Master Data States
  const [ots, setOts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [cssdPacks, setCssdPacks] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [dataStats, setDataStats] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter States inside Sub-Pages
  const [subSearch, setSubSearch] = useState('');
  const [subFilter, setSubFilter] = useState('ALL');

  // Modals States
  const [isAddOTModalOpen, setIsAddOTModalOpen] = useState(false);
  const [isEditOTModalOpen, setIsEditOTModalOpen] = useState(false);
  const [selectedOT, setSelectedOT] = useState<any>(null);
  const [otForm, setOtForm] = useState({ code: '', name: '', specialty: 'General Surgery', location: 'Building A, Floor 2', expectedTurnoverMinutes: 30 });

  const [isAddPackModalOpen, setIsAddPackModalOpen] = useState(false);
  const [isEditPackModalOpen, setIsEditPackModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [packForm, setPackForm] = useState({ packId: '', packType: 'Appendectomy Set', sterilizationBatch: '', sterilizedAt: new Date().toISOString().slice(0, 10), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), currentLocation: 'CSSD Sterile Storage Shelf A-1', notes: '' });

  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientForm, setPatientForm] = useState({ mrn: '', name: '', age: 45, gender: 'M', wardId: 'Ward 4B', bedNumber: 'Bed 401', primaryDiagnosis: 'Acute Appendicitis' });

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'OT_MANAGER', department: 'Surgical Suite' });

  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importEntity, setImportEntity] = useState<'patients' | 'ots' | 'cssd'>('patients');
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // ─── Complete Hospital Database Uploader State ─────────────────────────────
  const [dbUploadFile, setDbUploadFile] = useState<File | null>(null);
  const [parsedHospitalDb, setParsedHospitalDb] = useState<any | null>(null);
  const [dbImportMode, setDbImportMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [isImportingDb, setIsImportingDb] = useState(false);
  const [dbParseError, setDbParseError] = useState<string | null>(null);

  // Load Settings & Core Data
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [settingsRes, statsRes, healthRes] = await Promise.allSettled([
        api.getAdminSettings(),
        api.getAdminDataStats(),
        api.getSystemHealth(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value) setSettings(settingsRes.value);
      if (statsRes.status === 'fulfilled' && statsRes.value) setDataStats(statsRes.value);
      if (healthRes.status === 'fulfilled' && healthRes.value) setSystemHealth(healthRes.value);

      // Fetch dynamic active entity lists
      loadOTs();
      loadPatients();
      loadCSSDPacks();
      loadUsers();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOTs = async () => {
    try {
      const res = await api.getAdminOTs();
      if (res && res.data) setOts(res.data);
    } catch (e) {}
  };

  const loadPatients = async () => {
    try {
      const res = await api.getAdminPatients();
      if (res && res.data) setPatients(res.data);
    } catch (e) {}
  };

  const loadCSSDPacks = async () => {
    try {
      const res = await api.getAdminCSSDPacks();
      if (res && res.data) setCssdPacks(res.data);
    } catch (e) {}
  };

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      if (res && res.data) setUsersList(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveSettings = async (customSettings?: any) => {
    if (!isAdmin) {
      setRestrictedActionName('Save System Settings & Benchmarks');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    try {
      const payload = customSettings || settings;
      const res = await api.updateAdminSettings(payload);
      setSettings(res);
      showNotification('success', 'Configuration settings updated and applied across workflow engines.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update settings');
    }
  };

  // ─── OT Handlers ──────────────────────────────────────────────────────────
  const handleCreateOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Provision New Operating Theatre');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    try {
      await api.createAdminOT(otForm);
      showNotification('success', `Operating Theatre ${otForm.code} created successfully.`);
      setIsAddOTModalOpen(false);
      setOtForm({ code: '', name: '', specialty: 'General Surgery', location: 'Building A, Floor 2', expectedTurnoverMinutes: 30 });
      loadOTs();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdateOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Modify Operating Theatre Specs');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!selectedOT) return;
    try {
      await api.updateAdminOT(selectedOT.id, selectedOT);
      showNotification('success', `Operating Theatre ${selectedOT.code} updated.`);
      setIsEditOTModalOpen(false);
      loadOTs();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleArchiveOT = async (ot: any) => {
    if (!isAdmin) {
      setRestrictedActionName('Archive / Decommission Operating Theatre');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    const isArchiving = !ot.archived;
    if (!window.confirm(`${isArchiving ? 'Archive' : 'Restore'} ${ot.code}? ${isArchiving ? 'This theatre will no longer be available for active scheduling.' : 'This theatre will become available again.'}`)) {
      return;
    }
    try {
      await api.archiveAdminOT(ot.id, isArchiving);
      showNotification('success', `${ot.code} ${isArchiving ? 'archived' : 'restored'} successfully.`);
      loadOTs();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // ─── CSSD Pack Handlers ───────────────────────────────────────────────────
  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Register CSSD Sterile Pack');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (new Date(packForm.expiresAt) <= new Date(packForm.sterilizedAt)) {
      showNotification('error', 'Validation Error: Expiry date must be after sterilization date.');
      return;
    }
    try {
      await api.createAdminCSSDPack(packForm);
      showNotification('success', `CSSD Pack ${packForm.packId} registered into Sterile Supply Chain.`);
      setIsAddPackModalOpen(false);
      setPackForm({ packId: '', packType: 'Appendectomy Set', sterilizationBatch: '', sterilizedAt: new Date().toISOString().slice(0, 10), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), currentLocation: 'CSSD Sterile Storage Shelf A-1', notes: '' });
      loadCSSDPacks();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Modify Sterile Pack Information');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!selectedPack) return;
    try {
      await api.updateAdminCSSDPack(selectedPack.id, selectedPack);
      showNotification('success', `Pack ${selectedPack.packId} details updated.`);
      setIsEditPackModalOpen(false);
      loadCSSDPacks();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleArchivePack = async (pack: any) => {
    if (!isAdmin) {
      setRestrictedActionName('Decommission Sterile Pack');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!window.confirm(`Archive and block sterile pack ${pack.packId}? It will be invalidated from all surgery assignments.`)) return;
    try {
      await api.archiveAdminCSSDPack(pack.id);
      showNotification('success', `Pack ${pack.packId} safely archived and blocked.`);
      loadCSSDPacks();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // ─── Patient Handlers ─────────────────────────────────────────────────────
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Create Inpatient Record');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    try {
      await api.createAdminPatient(patientForm);
      showNotification('success', `Synthetic Patient record created for ${patientForm.name} (${patientForm.mrn}).`);
      setIsAddPatientModalOpen(false);
      setPatientForm({ mrn: '', name: '', age: 45, gender: 'M', wardId: 'Ward 4B', bedNumber: 'Bed 401', primaryDiagnosis: 'Acute Appendicitis' });
      loadPatients();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Edit Patient Demographics');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!selectedPatient) return;
    try {
      await api.updateAdminPatient(selectedPatient.id, selectedPatient);
      showNotification('success', `Patient ${selectedPatient.name} updated.`);
      setIsEditPatientModalOpen(false);
      loadPatients();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleArchivePatient = async (pat: any) => {
    if (!isAdmin) {
      setRestrictedActionName('Soft-Archive Inpatient Record');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!window.confirm(`Soft-archive clinical record for ${pat.name} (${pat.mrn})? Historical audit logs and past surgical records will remain immutable.`)) return;
    try {
      await api.archiveAdminPatient(pat.id);
      showNotification('success', `Patient ${pat.name} soft-archived. Clinical history preserved in audit logs.`);
      loadPatients();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // ─── User Handlers ────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Provision Staff Account & Role');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    try {
      await api.createAdminUser(userForm);
      showNotification('success', `Staff account provisioned for ${userForm.name} (${userForm.role}).`);
      setIsAddUserModalOpen(false);
      setUserForm({ email: '', name: '', role: 'OT_MANAGER', department: 'Surgical Suite' });
      loadUsers();
      api.getAdminDataStats().then(setDataStats);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setRestrictedActionName('Update Staff Role Permissions');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!userForm.email) return;
    try {
      await api.updateAdminUser((userForm as any).id, userForm);
      showNotification('success', `User permissions updated.`);
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // ─── Demo Reset Handler ───────────────────────────────────────────────────
  const handleResetDemo = async () => {
    if (!isAdmin) {
      setRestrictedActionName('Execute System Database Reset');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (resetConfirmInput !== 'RESET DEMO') {
      showNotification('error', 'Confirmation string mismatch. Please type "RESET DEMO" precisely.');
      return;
    }
    try {
      setIsLoading(true);
      await api.resetDemoData('RESET DEMO');
      showNotification('success', 'Demo environment successfully reset to fresh baseline synthetic records.');
      setIsResetConfirmModalOpen(false);
      setResetConfirmInput('');
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Export Handler ───────────────────────────────────────────────────────
  const handleExport = (entity: string, format: 'json' | 'csv') => {
    const token = localStorage.getItem('smartot_auth_token');
    const url = `/api/admin/export/${entity}?format=${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `smartot_${entity}_export_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotification('success', `Exported ${entity.toUpperCase()} data as ${format.toUpperCase()}.`);
      })
      .catch((err) => showNotification('error', `Export failed: ${err.message}`));
  };

  // ─── Hospital Database Uploader & Preset Datasets ─────────────────────────
  const SAMPLE_METRO_TEMPLATE = {
    hospitalName: "Metropolitan Multi-Specialty Hospital",
    hospitalCode: "METRO-HOSP-01",
    operating_theatres: [
      { id: "ot_01", code: "OT-01", name: "Operating Theatre 1", specialty: "General Surgery", currentStatus: "SURGERY_STARTED", expectedTurnoverMinutes: 25, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
      { id: "ot_02", code: "OT-02", name: "Operating Theatre 2", specialty: "Orthopedic Surgery", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 30, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
      { id: "ot_03", code: "OT-03", name: "Operating Theatre 3", specialty: "Emergency & Trauma", currentStatus: "PREPARING", expectedTurnoverMinutes: 25, currentDelayMinutes: 18, riskLevel: "HIGH", lastUpdated: new Date().toISOString() },
      { id: "ot_04", code: "OT-04", name: "Operating Theatre 4", specialty: "Cardiothoracic Surgery", currentStatus: "TURNOVER", expectedTurnoverMinutes: 25, currentDelayMinutes: 8, riskLevel: "MEDIUM", lastUpdated: new Date().toISOString() }
    ],
    patients: [
      { id: "pat_1024", mrn: "MRN-2026-1024", name: "Arthur Pendelton", age: 54, gender: "M", wardId: "Ward 4B", bedNumber: "Bed 402", status: "PREPARING", primaryDiagnosis: "Acute Appendicitis", admissionDate: new Date().toISOString() },
      { id: "pat_1025", mrn: "MRN-2026-1025", name: "Eleanor Sterling", age: 48, gender: "F", wardId: "Ward 3A", bedNumber: "Bed 310", status: "IN_SURGERY", primaryDiagnosis: "Cholelithiasis", admissionDate: new Date().toISOString() },
      { id: "pat_1026", mrn: "MRN-2026-1026", name: "Robert Chen", age: 66, gender: "M", wardId: "Ward 2C", bedNumber: "Bed 205", status: "ADMITTED", primaryDiagnosis: "Coronary Artery Disease", admissionDate: new Date().toISOString() },
      { id: "pat_1027", mrn: "MRN-2026-1027", name: "Maria Gonzalez", age: 39, gender: "F", wardId: "Ward 4B", bedNumber: "Bed 415", status: "READY_FOR_OT", primaryDiagnosis: "Total Knee Arthroplasty", admissionDate: new Date().toISOString() }
    ],
    surgeries: [
      { id: "surg_1024", patientId: "pat_1024", otId: "ot_03", procedureName: "Emergency Appendectomy", surgeonName: "Dr. Robert Martinez", anesthesiologistName: "Dr. Lisa Wong", requiredPackType: "Appendectomy Set", scheduledStartTime: new Date(Date.now() + 1800000).toISOString(), expectedDurationMinutes: 75, priority: "EMERGENCY", status: "SCHEDULED", delayMinutes: 18, riskLevel: "HIGH" },
      { id: "surg_1025", patientId: "pat_1025", otId: "ot_01", procedureName: "Laparoscopic Cholecystectomy", surgeonName: "Dr. Amanda Clark", anesthesiologistName: "Dr. Kevin Patel", requiredPackType: "Laparotomy Major Set", scheduledStartTime: new Date(Date.now() - 3600000).toISOString(), expectedDurationMinutes: 90, priority: "ELECTIVE", status: "IN_PROGRESS", delayMinutes: 0, riskLevel: "LOW" },
      { id: "surg_1026", patientId: "pat_1026", otId: "ot_04", procedureName: "Coronary Artery Bypass (CABG)", surgeonName: "Dr. Vikram Seth", anesthesiologistName: "Dr. Kevin Patel", requiredPackType: "Cardiac Bypass Tray", scheduledStartTime: new Date(Date.now() + 5400000).toISOString(), expectedDurationMinutes: 240, priority: "URGENT", status: "SCHEDULED", delayMinutes: 8, riskLevel: "MEDIUM" }
    ],
    cssd_packs: [
      { id: "cssd_001", packId: "CSSD-001", packType: "Appendectomy Set", sterilizationBatch: "BATCH-2026-0819-A", sterilizedAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Sterile Room A-1" },
      { id: "cssd_002", packId: "CSSD-002", packType: "Laparotomy Major Set", sterilizationBatch: "BATCH-2026-0818-B", sterilizedAt: new Date(Date.now() - 172800000).toISOString(), expiresAt: new Date(Date.now() + 518400000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "IN_USE", currentLocation: "OT-01" },
      { id: "cssd_003", packId: "CSSD-003", packType: "Cardiac Bypass Tray", sterilizationBatch: "BATCH-2026-0819-C", sterilizedAt: new Date(Date.now() - 43200000).toISOString(), expiresAt: new Date(Date.now() + 648000000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Sterile Room B-3" },
      { id: "cssd_004", packId: "CSSD-004", packType: "Orthopedic Arthroplasty Set", sterilizationBatch: "BATCH-2026-0817-A", sterilizedAt: new Date(Date.now() - 259200000).toISOString(), expiresAt: new Date(Date.now() + 432000000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Sterile Room A-2" }
    ],
    system_settings: {
      hospitalName: "Metropolitan Multi-Specialty Hospital",
      hospitalCode: "METRO-HOSP-01",
      timezone: "Asia/Kolkata",
      otDelayWarningMinutes: 10,
      otDelayCriticalMinutes: 20,
      turnoverWarningMinutes: 25,
      transferWarningMinutes: 15,
      aiEnabled: true
    }
  };

  const handleLoadPresetTemplate = (type: 'metro' | 'trauma' | 'cardiac') => {
    let templateData: any;
    if (type === 'trauma') {
      templateData = {
        hospitalName: "Metro Trauma & Emergency Medical Center",
        hospitalCode: "TRAUMA-EMERG-01",
        operating_theatres: [
          { id: "ot_01", code: "OT-01", name: "Trauma Resuscitation Suite 1", specialty: "Trauma & Emergency", currentStatus: "PREPARING", expectedTurnoverMinutes: 20, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_02", code: "OT-02", name: "Orthopedic Trauma Suite 2", specialty: "Orthopedic Trauma", currentStatus: "SURGERY_STARTED", expectedTurnoverMinutes: 25, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_03", code: "OT-03", name: "Emergency General Surgery 3", specialty: "General Emergency", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 20, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_04", code: "OT-04", name: "Neurosurgical Suite 4", specialty: "Neurotrauma", currentStatus: "TURNOVER", expectedTurnoverMinutes: 25, currentDelayMinutes: 5, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_05", code: "OT-05", name: "Vascular Emergency Suite 5", specialty: "Vascular Surgery", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 20, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_06", code: "OT-06", name: "Pediatric Emergency Suite 6", specialty: "Pediatric Surgery", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 25, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() }
        ],
        patients: [
          { id: "pat_2001", mrn: "MRN-2026-2001", name: "Marcus Vance", age: 34, gender: "M", wardId: "Emergency Ward", bedNumber: "Bed E-01", status: "READY_FOR_OT", primaryDiagnosis: "Polytrauma / Femur Fracture", admissionDate: new Date().toISOString() },
          { id: "pat_2002", mrn: "MRN-2026-2002", name: "Sarah Connor", age: 42, gender: "F", wardId: "Trauma ICU", bedNumber: "Bed T-04", status: "IN_SURGERY", primaryDiagnosis: "Closed Head Injury", admissionDate: new Date().toISOString() },
          { id: "pat_2003", mrn: "MRN-2026-2003", name: "David Kim", age: 29, gender: "M", wardId: "Emergency Ward", bedNumber: "Bed E-08", status: "PREPARING", primaryDiagnosis: "Acute Hemoperitoneum", admissionDate: new Date().toISOString() }
        ],
        surgeries: [
          { id: "surg_2001", patientId: "pat_2001", otId: "ot_02", procedureName: "Open Reduction Internal Fixation (ORIF)", surgeonName: "Dr. Gregory House", anesthesiologistName: "Dr. Lisa Cuddy", requiredPackType: "Orthopedic Arthroplasty Set", scheduledStartTime: new Date(Date.now() - 1800000).toISOString(), expectedDurationMinutes: 120, priority: "EMERGENCY", status: "IN_PROGRESS", delayMinutes: 0, riskLevel: "LOW" },
          { id: "surg_2002", patientId: "pat_2003", otId: "ot_01", procedureName: "Emergency Exploratory Laparotomy", surgeonName: "Dr. Robert Martinez", anesthesiologistName: "Dr. Lisa Wong", requiredPackType: "Laparotomy Major Set", scheduledStartTime: new Date(Date.now() + 1200000).toISOString(), expectedDurationMinutes: 90, priority: "EMERGENCY", status: "SCHEDULED", delayMinutes: 0, riskLevel: "LOW" }
        ],
        cssd_packs: [
          { id: "cssd_201", packId: "CSSD-TRAUMA-01", packType: "Orthopedic Arthroplasty Set", sterilizationBatch: "BATCH-TR-01", sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "IN_USE", currentLocation: "OT-02" },
          { id: "cssd_202", packId: "CSSD-TRAUMA-02", packType: "Laparotomy Major Set", sterilizationBatch: "BATCH-TR-02", sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Trauma Bay" },
          { id: "cssd_203", packId: "CSSD-TRAUMA-03", packType: "Craniotomy Specialized Set", sterilizationBatch: "BATCH-TR-03", sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Trauma Bay" }
        ],
        system_settings: {
          hospitalName: "Metro Trauma & Emergency Medical Center",
          hospitalCode: "TRAUMA-EMERG-01",
          timezone: "Asia/Kolkata",
          otDelayWarningMinutes: 5,
          otDelayCriticalMinutes: 15,
          turnoverWarningMinutes: 20,
          transferWarningMinutes: 10,
          aiEnabled: true
        }
      };
    } else if (type === 'cardiac') {
      templateData = {
        hospitalName: "Cardiovascular & Transplant Surgical Institute",
        hospitalCode: "CARDIO-INST-01",
        operating_theatres: [
          { id: "ot_01", code: "OT-01", name: "Hybrid Cardiac Suite 1", specialty: "Cardiothoracic", currentStatus: "SURGERY_STARTED", expectedTurnoverMinutes: 30, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_02", code: "OT-02", name: "Aortic Arch & Valve Suite 2", specialty: "Cardiovascular", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 30, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() },
          { id: "ot_03", code: "OT-03", name: "Transplant & Assist Suite 3", specialty: "Heart/Lung Transplant", currentStatus: "PREPARING", expectedTurnoverMinutes: 35, currentDelayMinutes: 10, riskLevel: "MEDIUM", lastUpdated: new Date().toISOString() },
          { id: "ot_04", code: "OT-04", name: "Vascular Endovascular Suite 4", specialty: "Endovascular", currentStatus: "AVAILABLE", expectedTurnoverMinutes: 25, currentDelayMinutes: 0, riskLevel: "LOW", lastUpdated: new Date().toISOString() }
        ],
        patients: [
          { id: "pat_3001", mrn: "MRN-2026-3001", name: "Alexander Wright", age: 62, gender: "M", wardId: "Cardiology Ward", bedNumber: "Bed C-102", status: "IN_SURGERY", primaryDiagnosis: "Triple Vessel CAD", admissionDate: new Date().toISOString() },
          { id: "pat_3002", mrn: "MRN-2026-3002", name: "Helena Rostova", age: 58, gender: "F", wardId: "Cardiology Ward", bedNumber: "Bed C-108", status: "PREPARING", primaryDiagnosis: "Severe Aortic Stenosis", admissionDate: new Date().toISOString() }
        ],
        surgeries: [
          { id: "surg_3001", patientId: "pat_3001", otId: "ot_01", procedureName: "Off-Pump CABG x3", surgeonName: "Dr. Vikram Seth", anesthesiologistName: "Dr. Kevin Patel", requiredPackType: "Cardiac Bypass Tray", scheduledStartTime: new Date(Date.now() - 3600000).toISOString(), expectedDurationMinutes: 240, priority: "URGENT", status: "IN_PROGRESS", delayMinutes: 0, riskLevel: "LOW" },
          { id: "surg_3002", patientId: "pat_3002", otId: "ot_03", procedureName: "Transcatheter Aortic Valve Replacement (TAVR)", surgeonName: "Dr. Amanda Clark", anesthesiologistName: "Dr. Lisa Wong", requiredPackType: "Cardiac Bypass Tray", scheduledStartTime: new Date(Date.now() + 3600000).toISOString(), expectedDurationMinutes: 150, priority: "ELECTIVE", status: "SCHEDULED", delayMinutes: 10, riskLevel: "MEDIUM" }
        ],
        cssd_packs: [
          { id: "cssd_301", packId: "CSSD-CARDIO-01", packType: "Cardiac Bypass Tray", sterilizationBatch: "BATCH-CV-01", sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "IN_USE", currentLocation: "OT-01" },
          { id: "cssd_302", packId: "CSSD-CARDIO-02", packType: "Cardiac Bypass Tray", sterilizationBatch: "BATCH-CV-02", sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: "STERILIZED", currentStatus: "AVAILABLE", currentLocation: "CSSD Cardiac Room" }
        ],
        system_settings: {
          hospitalName: "Cardiovascular & Transplant Surgical Institute",
          hospitalCode: "CARDIO-INST-01",
          timezone: "Asia/Kolkata",
          otDelayWarningMinutes: 10,
          otDelayCriticalMinutes: 20,
          turnoverWarningMinutes: 30,
          transferWarningMinutes: 15,
          aiEnabled: true
        }
      };
    } else {
      templateData = SAMPLE_METRO_TEMPLATE;
    }

    setParsedHospitalDb(templateData);
    setDbUploadFile(new File([JSON.stringify(templateData, null, 2)], `preset_${type}_hospital.json`, { type: 'application/json' }));
    setDbParseError(null);
    showNotification('success', `Loaded ${templateData.hospitalName} dataset preview. Review below and click "Import & Apply Database" to activate.`);
  };

  const handleProcessDbFile = (file: File) => {
    setDbUploadFile(file);
    setDbParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Root JSON element must be an object.');
        }
        setParsedHospitalDb(parsed);
        showNotification('success', `Valid hospital database parsed: ${file.name}`);
      } catch (err: any) {
        setParsedHospitalDb(null);
        setDbParseError(`Invalid JSON format: ${err.message}`);
        showNotification('error', `Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteDatabaseImport = async () => {
    if (!isAdmin) {
      setRestrictedActionName('Import Hospital Database');
      setIsPermissionDeniedModalOpen(true);
      return;
    }
    if (!parsedHospitalDb) {
      showNotification('error', 'Please upload or select a valid hospital database JSON first.');
      return;
    }

    try {
      setIsImportingDb(true);
      const res = await api.importHospitalDatabase(parsedHospitalDb, dbImportMode);
      showNotification('success', res.message || 'Hospital database successfully imported and assigned across all options.');
      loadInitialData();
      setParsedHospitalDb(null);
      setDbUploadFile(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to import hospital database.');
    } finally {
      setIsImportingDb(false);
    }
  };

  const handleDownloadSampleTemplate = () => {
    const jsonStr = JSON.stringify(SAMPLE_METRO_TEMPLATE, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartot-hospital-database-template.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showNotification('success', 'Sample Hospital Database Template downloaded.');
  };

  // Filter navigation items
  const filteredNavGroups = NAV_GROUPS.map((grp) => ({
    ...grp,
    items: grp.items.filter((item) => item.label.toLowerCase().includes(navSearch.toLowerCase())),
  })).filter((grp) => grp.items.length > 0);

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden select-none">
      {/* ─── Left Settings Sidebar ────────────────────────────────────────── */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-sm">
              <Settings className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 heading-serif">Admin Command</h2>
              <p className="text-[10px] text-slate-500 font-medium">Data Governance & Configuration</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mt-3">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {filteredNavGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <p className="px-2.5 text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">
                {grp.group}
              </p>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSubSearch('');
                      setSubFilter('ALL');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white font-bold shadow-sm shadow-teal-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Operator Badge */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-slate-700">RBAC: {user?.role || 'ADMINISTRATOR'}</span>
            </div>
            <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono font-bold">
              v1.4 Enterprise
            </span>
          </div>
        </div>
      </aside>

      {/* ─── Center Content Area ─────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto p-6 space-y-6">
        {/* Floating feedback alert */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Read-Only RBAC Security Banner for Non-Administrators */}
        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-amber-950 flex items-center space-x-2">
                  <span>Read-Only Administrative Console</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                    {user?.role || 'NON_ADMIN'}
                  </span>
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                  You are signed in as <strong>{user?.name || 'Hospital Staff'}</strong> ({user?.role?.replace('_', ' ')}). You can review all master data, clinical lists, and telemetry. Only staff with the <strong>ADMINISTRATOR</strong> role can create, modify, archive, or configure settings.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await quickLoginAs('ADMINISTRATOR');
                showNotification('success', 'Logged in as Administrator (Dr. Sarah Jenkins). Full edit access unlocked.');
              }}
              className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shrink-0 transition flex items-center space-x-1.5 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Switch to Administrator</span>
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            1. DATA MANAGEMENT CENTER & HOSPITAL DATABASE UPLOADER (/settings/data-management)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'data-management' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <Database className="h-5 w-5 text-teal-600" />
                  <span>Centralized Data Management & Hospital Database Uploader</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import hospital datasets, auto-assign records across all operational modules, and govern clinical master data
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadSampleTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  title="Download a clean hospital JSON schema template"
                >
                  <Download className="h-3.5 w-3.5 text-teal-600" />
                  <span>Sample Template (.json)</span>
                </button>

                <button
                  onClick={() => api.exportHospitalDatabase()}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  title="Download complete live hospital database snapshot"
                >
                  <FileCode className="h-3.5 w-3.5 text-teal-600" />
                  <span>Export Live Database</span>
                </button>

                <button
                  onClick={() => requireAdmin('Reset Demo Environment', () => setIsResetConfirmModalOpen(true))}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Demo Data</span>
                  {!isAdmin && <Lock className="h-3 w-3 text-rose-500 ml-1" />}
                </button>
              </div>
            </div>

            {/* ─── HERO UPLOADER & AUTO-ASSIGNMENT ENGINE ─── */}
            <div className="glass-card p-6 border-2 border-teal-500/30 bg-gradient-to-br from-teal-50/40 via-white to-slate-50 space-y-5 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-teal-100 pb-4">
                <div className="flex items-start space-x-3">
                  <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-500/20 shrink-0">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 heading-serif flex items-center flex-wrap gap-2">
                      <span>Hospital Database Uploader & Auto-Assignment Engine</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap inline-flex items-center">
                        1-Click Auto Sync
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Upload your hospital's complete database JSON to automatically populate and assign all <strong>Operating Theatres, Inpatient Admissions, Surgical Schedules, CSSD Sterile Packs, Staff Users, and System Thresholds</strong> across the entire SmartOT platform in real time.
                    </p>
                  </div>
                </div>

                {/* Preset Loaders Dropdown / Quick Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 self-center hidden lg:inline">Quick Presets:</span>
                  <button
                    onClick={() => handleLoadPresetTemplate('metro')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-teal-200 hover:bg-teal-50 text-teal-800 text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <span>🏢 General Hospital</span>
                  </button>
                  <button
                    onClick={() => handleLoadPresetTemplate('trauma')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <span>🚑 Trauma Center</span>
                  </button>
                  <button
                    onClick={() => handleLoadPresetTemplate('cardiac')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-800 text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <span>🫀 Cardiac Institute</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="hospital-db-file-input"
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      parsedHospitalDb
                        ? 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/70'
                        : 'border-slate-300 bg-white/60 hover:border-teal-400 hover:bg-teal-50/20'
                    }`}
                  >
                    <input
                      id="hospital-db-file-input"
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleProcessDbFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div className="p-3 rounded-full bg-teal-50 text-teal-700 mb-2">
                      <FileCode className="h-6 w-6" />
                    </div>

                    {dbUploadFile ? (
                      <div>
                        <p className="text-xs font-black text-slate-900">{dbUploadFile.name}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          ✓ File ready for import ({(dbUploadFile.size / 1024).toFixed(1)} KB)
                        </p>
                        <span className="inline-block mt-2 text-[10px] text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded font-bold">
                          Click to select a different JSON database file
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-black text-slate-800">
                          Drop hospital database JSON here or <span className="text-teal-600 underline">browse files</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Supports full hospital schemas with Theatres, Patients, Surgeries, CSSD Packs & Staff
                        </p>
                      </div>
                    )}
                  </label>

                  {dbParseError && (
                    <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{dbParseError}</span>
                    </div>
                  )}
                </div>

                {/* Import Mode & Actions Column */}
                <div className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                      Import Strategy Mode
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        dbImportMode === 'REPLACE' ? 'bg-teal-50/60 border-teal-300 text-teal-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="REPLACE"
                          checked={dbImportMode === 'REPLACE'}
                          onChange={() => setDbImportMode('REPLACE')}
                          className="mt-0.5 text-teal-600"
                        />
                        <div>
                          <span className="text-xs font-bold block">Replace Complete Hospital Database</span>
                          <span className="text-[10px] text-slate-500 block leading-snug mt-0.5">
                            Clean facility setup: overwrites active hospital tables with the uploaded dataset.
                          </span>
                        </div>
                      </label>

                      <label className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        dbImportMode === 'MERGE' ? 'bg-teal-50/60 border-teal-300 text-teal-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          value="MERGE"
                          checked={dbImportMode === 'MERGE'}
                          onChange={() => setDbImportMode('MERGE')}
                          className="mt-0.5 text-teal-600"
                        />
                        <div>
                          <span className="text-xs font-bold block">Merge & Upsert Records</span>
                          <span className="text-[10px] text-slate-500 block leading-snug mt-0.5">
                            Updates existing IDs and inserts new records without clearing other tables.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteDatabaseImport}
                    disabled={!parsedHospitalDb || isImportingDb}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center space-x-2 shadow-md ${
                      !parsedHospitalDb || isImportingDb
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30'
                    }`}
                  >
                    {isImportingDb ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Assigning Hospital Data...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Import & Apply to Entire Hospital</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Preview Metrics if Parsed */}
              {parsedHospitalDb && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-white border border-teal-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 heading-serif flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Parsed Dataset Schema Overview: <strong>{parsedHospitalDb.hospitalName || 'Hospital Database'}</strong></span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Ready to commit</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Operating Theatres</span>
                      <strong className="text-sm font-black text-teal-700 heading-serif">
                        {parsedHospitalDb.operating_theatres?.length || 0} Suites
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Inpatients</span>
                      <strong className="text-sm font-black text-teal-700 heading-serif">
                        {parsedHospitalDb.patients?.length || 0} Records
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Surgical Schedule</span>
                      <strong className="text-sm font-black text-teal-700 heading-serif">
                        {parsedHospitalDb.surgeries?.length || 0} Procedures
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">CSSD Sterile Packs</span>
                      <strong className="text-sm font-black text-teal-700 heading-serif">
                        {parsedHospitalDb.cssd_packs?.length || 0} Packs
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Staff Accounts</span>
                      <strong className="text-sm font-black text-teal-700 heading-serif">
                        {parsedHospitalDb.users?.length || 0} Users
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">System Benchmarks</span>
                      <strong className="text-sm font-black text-emerald-700 heading-serif">
                        {parsedHospitalDb.system_settings ? 'Configured' : 'Defaults'}
                      </strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Entity Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'PATIENTS & INPATIENTS',
                  count: (dataStats?.patients?.active ?? (patients.filter((p) => !p.archived).length || 28)) + (dataStats?.patients?.archived ?? 2),
                  active: dataStats?.patients?.active || (patients.filter((p) => !p.archived).length || 28),
                  archived: dataStats?.patients?.archived ?? 2,
                  entity: 'patients',
                  tab: 'patients' as SettingsSection,
                },
                {
                  title: 'OPERATING THEATRES',
                  count: (dataStats?.operatingTheatres?.active ?? (ots.filter((o) => !o.archived).length || 4)) + (dataStats?.operatingTheatres?.archived ?? 0),
                  active: dataStats?.operatingTheatres?.active || (ots.filter((o) => !o.archived).length || 4),
                  archived: dataStats?.operatingTheatres?.archived ?? 0,
                  entity: 'ots',
                  tab: 'ots' as SettingsSection,
                },
                {
                  title: 'CSSD STERILE PACKS',
                  count: (dataStats?.cssdPacks?.available ?? (cssdPacks.filter((p) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED').length || 22)) + (dataStats?.cssdPacks?.expired ?? 4),
                  active: dataStats?.cssdPacks?.available || (cssdPacks.filter((p) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED').length || 22),
                  archived: dataStats?.cssdPacks?.expired ?? 4,
                  entity: 'cssd',
                  tab: 'cssd' as SettingsSection,
                },
                {
                  title: 'SURGERY SCHEDULES',
                  count: dataStats?.surgeries?.total || 14,
                  active: dataStats?.surgeries?.active || 10,
                  archived: dataStats?.surgeries?.completed || 4,
                  entity: 'surgeries',
                  tab: 'schedules' as SettingsSection,
                },
                {
                  title: 'WORKFLOW EVENTS',
                  count: dataStats?.workflowEvents?.total || 62,
                  active: 'Immutable',
                  archived: '0',
                  entity: 'events',
                  tab: 'audit' as SettingsSection,
                },
                {
                  title: 'OPERATIONAL ALERTS',
                  count: dataStats?.alerts?.total || 11,
                  active: dataStats?.alerts?.open || 3,
                  archived: dataStats?.alerts?.resolved || 8,
                  entity: 'alerts',
                  tab: 'alerts' as SettingsSection,
                },
                {
                  title: 'AUTHENTICATED USERS',
                  count: dataStats?.users?.total || usersList.length || 4,
                  active: 'RBAC Active',
                  archived: '0',
                  entity: 'users',
                  tab: 'users' as SettingsSection,
                },
                {
                  title: 'AUDIT TRAIL LOGS',
                  count: dataStats?.auditLogs?.total || 48,
                  active: 'Encrypted',
                  archived: 'Retained',
                  entity: 'audit',
                  tab: 'audit' as SettingsSection,
                },
              ].map((card) => (
                <div key={card.title} className="glass-card p-4 space-y-3 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{card.title}</span>
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 heading-serif">
                      {card.count} <span className="text-xs font-medium text-slate-500">Records</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                      <span>Active: <strong className="text-emerald-700">{card.active}</strong></span>
                      <span>•</span>
                      <span>Archived: <strong className="text-slate-700">{card.archived}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => setActiveSection(card.tab)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition flex-1 text-center"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleExport(card.entity, 'csv')}
                      title="Export CSV"
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => handleExport(card.entity, 'json')}
                      title="Export JSON"
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                    >
                      <FileCode className="h-3.5 w-3.5 text-teal-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Safe Deletion & Retention Principles Banner */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1.5 text-blue-950">
              <div className="flex items-center space-x-2 font-bold text-blue-900">
                <ShieldCheck className="h-4 w-4" />
                <span>Enterprise Healthcare Data Protection & Retention Policy</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                In compliance with clinical governance standards, SmartOT enforces <strong>Soft Deletion & Immutable Event Logs</strong>. Clinical workflow records, patient transfers, and surgical states cannot be permanently purged via the front interface. Archiving removes items from active operations while preserving historical analytics.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            2. OPERATING THEATRES MANAGEMENT
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'ots' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  <span>Operating Theatre Master Registry</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure surgical suites, designated specialties, expected turnover thresholds, and maintenance status
                </p>
              </div>

              <button
                onClick={() => setIsAddOTModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Operating Theatre</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search code, name, specialty..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-teal-500 shadow-sm"
                />
              </div>

              <select
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="SURGERY_STARTED">SURGERY_STARTED</option>
                <option value="TURNOVER">TURNOVER</option>
              </select>
            </div>

            {/* Table */}
            <div className="glass-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">OT Code & Name</th>
                      <th className="py-3 px-4">Designated Specialty</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Turnover Target</th>
                      <th className="py-3 px-4">Current Delay</th>
                      <th className="py-3 px-4">Live Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {ots
                      .filter((o) => subFilter === 'ALL' || o.currentStatus === subFilter)
                      .filter((o) => o.code.toLowerCase().includes(subSearch.toLowerCase()) || o.name.toLowerCase().includes(subSearch.toLowerCase()))
                      .map((ot) => (
                        <tr key={ot.id} className={`hover:bg-slate-50 transition ${ot.archived ? 'opacity-50 bg-slate-50/80' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-teal-700">{ot.code}</div>
                            <div className="text-slate-900 font-bold">{ot.name}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{ot.specialty}</td>
                          <td className="py-3 px-4 text-slate-600">{ot.location || 'Main Surgical Wing'}</td>
                          <td className="py-3 px-4 font-mono">{ot.expectedTurnoverMinutes || 30} min</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {ot.currentDelayMinutes > 0 ? (
                              <span className="text-rose-600">+{ot.currentDelayMinutes}m</span>
                            ) : (
                              <span className="text-emerald-600">0m</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {ot.archived ? (
                              <StatusBadge status="ARCHIVED" tone="warning" />
                            ) : (
                              <StatusBadge status={ot.currentStatus} />
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedOT({ ...ot });
                                setIsEditOTModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleArchiveOT(ot)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                ot.archived
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {ot.archived ? 'Restore' : 'Archive'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            3. PATIENTS & READINESS MASTER DATA
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'patients' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-teal-600" />
                  <span>Patient Master Records (Synthetic)</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage inpatient admissions, assigned surgical pre-op wards, readiness stages, and consent status
                </p>
              </div>

              <button
                onClick={() => setIsAddPatientModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Admit New Patient</span>
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search MRN, name, diagnosis..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-teal-500 shadow-sm"
                />
              </div>

              <select
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="ADMITTED">ADMITTED</option>
                <option value="READY_FOR_OT">READY_FOR_OT</option>
                <option value="IN_TRANSFER">IN_TRANSFER</option>
                <option value="IN_SURGERY">IN_SURGERY</option>
              </select>
            </div>

            {/* Patient Table */}
            <div className="glass-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">MRN & Patient Name</th>
                      <th className="py-3 px-4">Demographics</th>
                      <th className="py-3 px-4">Ward & Bed</th>
                      <th className="py-3 px-4">Primary Diagnosis</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patients
                      .filter((p) => subFilter === 'ALL' || p.status === subFilter)
                      .filter((p) => p.mrn.toLowerCase().includes(subSearch.toLowerCase()) || p.name.toLowerCase().includes(subSearch.toLowerCase()) || p.primaryDiagnosis?.toLowerCase().includes(subSearch.toLowerCase()))
                      .map((pat) => (
                        <tr key={pat.id} className={`hover:bg-slate-50 transition ${pat.archived ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-teal-700">{pat.mrn}</div>
                            <div className="text-slate-900 font-bold">{pat.name}</div>
                          </td>
                          <td className="py-3 px-4">{pat.age}y • {pat.gender === 'M' ? 'Male' : 'Female'}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{pat.wardId}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{pat.bedNumber}</div>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate">{pat.primaryDiagnosis}</td>
                          <td className="py-3 px-4">
                            <StatusBadge status={pat.status} />
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedPatient({ ...pat });
                                setIsEditPatientModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleArchivePatient(pat)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs"
                            >
                              Archive
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            4. CSSD & STERILE PACKS MANAGEMENT
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'cssd' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <PackageCheck className="h-5 w-5 text-teal-600" />
                  <span>CSSD Sterile Tray Master Registry</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sterilization batch validation, barcode traceability, barrier expiry management, and quarantine rules
                </p>
              </div>

              <button
                onClick={() => setIsAddPackModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Register Sterile Pack</span>
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search Pack ID, Set Type, Batch..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-teal-500 shadow-sm"
                />
              </div>

              <select
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold shadow-sm"
              >
                <option value="ALL">All States</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="STORED">STORED</option>
                <option value="STERILIZING">STERILIZING</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>

            {/* Packs Table */}
            <div className="glass-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Pack ID</th>
                      <th className="py-3 px-4">Instrument Set Type</th>
                      <th className="py-3 px-4">Autoclave Batch</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Storage Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {cssdPacks
                      .filter((p) => subFilter === 'ALL' || p.currentStatus === subFilter)
                      .filter((p) => p.packId.toLowerCase().includes(subSearch.toLowerCase()) || p.packType.toLowerCase().includes(subSearch.toLowerCase()))
                      .map((pack) => {
                        const isExpired = new Date(pack.expiresAt) < new Date();
                        return (
                          <tr key={pack.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-teal-700">{pack.packId}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{pack.packType}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{pack.sterilizationBatch}</td>
                            <td className="py-3 px-4">
                              <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {new Date(pack.expiresAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{pack.currentLocation}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={pack.currentStatus} />
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPack({ ...pack });
                                  setIsEditPackModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleArchivePack(pack)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs"
                              >
                                Archive / Block
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5. USERS & ROLES (RBAC)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'users' && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  <span>Users & Role-Based Access Control (RBAC)</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage hospital staff persona accounts, departmental assignments, and granular operational permissions
                </p>
              </div>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add User Account</span>
              </button>
            </div>

            {/* User Table */}
            <div className="glass-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Email / Login ID</th>
                      <th className="py-3 px-4">Assigned Department</th>
                      <th className="py-3 px-4">RBAC Role</th>
                      <th className="py-3 px-4">Permissions Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">{u.department}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {u.role === 'ADMINISTRATOR' && 'Full Governance, Master Data, Audit Logs, Settings'}
                          {u.role === 'OT_MANAGER' && 'Surgical Scheduling, State Transitions, Delay Management'}
                          {u.role === 'CSSD_STAFF' && 'Sterilization Cycles, QR Verification, Pack Allocation'}
                          {u.role === 'WARD_STAFF' && 'Readiness Checklists, Pre-op Consent, Transfer Triggers'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            6. WORKFLOW CONFIGURATION
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'workflow' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-teal-600" />
                <span>Workflow Stages & Mandatory Verification Gates</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable clinical readiness criteria and specify operational timeout thresholds
              </p>
            </div>

            <div className="glass-card p-6 space-y-6">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Mandatory Pre-Op Patient Checklist Gates</h3>
              <div className="space-y-3">
                {[
                  { key: 'consentRequired', title: 'Mandatory Surgical Consent Verification', desc: 'Blocks OT transfer if valid surgical consent is not marked verified in ward' },
                  { key: 'documentationRequired', title: 'Pre-Anesthesia Documentation Clearance', desc: 'Requires PAC note and anesthesiology clearance prior to room staging' },
                  { key: 'preopPrepRequired', title: 'NPO Fasting & Pre-Op Prep Checklist', desc: 'Validates fasting hours and surgical site preparation completion' },
                  { key: 'reportsRequired', title: 'Diagnostic Labs & Imaging Attachment', desc: 'Requires blood type screen and necessary radiological reports available' },
                  { key: 'doctorConfirmationRequired', title: 'Attending Surgeon Final Confirmation', desc: 'Final attending surgeon check-in required before theatre wheels-in' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[item.key] !== false}
                        onChange={(e) => {
                          const updated = { ...settings, [item.key]: e.target.checked };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                    </label>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider pt-4 border-t border-slate-200">Surgical Turnaround Timeouts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Standard Theatre Turnover Target (Minutes)</label>
                  <input
                    type="number"
                    value={settings.turnoverWarningMinutes || 30}
                    onChange={(e) => setSettings({ ...settings, turnoverWarningMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Inpatient Transfer Delay Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={settings.transferWarningMinutes || 15}
                    onChange={(e) => setSettings({ ...settings, transferWarningMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition"
                >
                  Save Workflow Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            7. ALERT ENGINE RULES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'alerts' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                <BellRing className="h-5 w-5 text-teal-600" />
                <span>Automated Alert Rules & Delay Thresholds</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define criteria for real-time operational bottleneck detection across Theatre, CSSD, and Ward workflows
              </p>
            </div>

            <div className="glass-card p-6 space-y-4">
              {[
                { key: 'consentMissing', title: 'Missing Surgical Consent Before Scheduled Start', condition: 'Patient Consent != VERIFIED and Scheduled Start < 30m', defaultSeverity: 'CRITICAL' },
                { key: 'packUnavailable', title: 'CSSD Pack Not Assigned or Expired', condition: 'Assigned pack is missing, expired, or currently in autoclave', defaultSeverity: 'CRITICAL' },
                { key: 'transferNotStarted', title: 'Patient Transfer Not Initiated On-Time', condition: 'Patient ready in ward > 15m without porter dispatch event', defaultSeverity: 'WARNING' },
                { key: 'turnoverDelay', title: 'Theatre Room Turnover Exceeding Benchmark', condition: 'Sanitization & turnover duration > 30m target', defaultSeverity: 'WARNING' },
                { key: 'otDelay', title: 'Surgical Start Behind Schedule', condition: 'Current start time exceeds scheduled slot > 10m', defaultSeverity: 'WARNING' },
              ].map((rule) => (
                <div key={rule.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rule.title}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{rule.condition}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {rule.defaultSeverity}
                    </span>
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Alert Engine evaluates rules every 30 seconds against active database state.</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            8. AI OPERATIONS CONFIGURATION
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'ai' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                <Bot className="h-5 w-5 text-teal-600" />
                <span>AI Operations Consultant Governance</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure artificial intelligence operational assistance, delay predictions, and clinical safety boundaries
              </p>
            </div>

            <div className="glass-card p-6 space-y-5">
              {/* Healthcare Boundary Alert */}
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-rose-900">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Mandatory Healthcare Clinical Safety Boundary</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  SmartOT AI Operations Consultant is strictly constrained to <strong>workflow orchestration, bottleneck root-cause analysis, and resource turnover recommendations</strong>. It does not provide medical diagnoses, treatment advice, or drug prescriptions.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Enable AI Operations Consultant</p>
                    <p className="text-[11px] text-slate-500">Provide intelligent operational advice in chat drawer and analytics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiEnabled !== false}
                    onChange={(e) => {
                      const upd = { ...settings, aiEnabled: e.target.checked };
                      setSettings(upd);
                      handleSaveSettings(upd);
                    }}
                    className="h-4 w-4 text-teal-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Predictive Delay Forecasting</p>
                    <p className="text-[11px] text-slate-500">Calculate cumulative cascaded delays based on historical duration variance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiRiskPredictionEnabled !== false}
                    onChange={(e) => {
                      const upd = { ...settings, aiRiskPredictionEnabled: e.target.checked };
                      setSettings(upd);
                      handleSaveSettings(upd);
                    }}
                    className="h-4 w-4 text-teal-600 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confidence Threshold for Next-Best-Action ({settings.aiConfidenceThreshold || 70}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={settings.aiConfidenceThreshold || 70}
                  onChange={(e) => setSettings({ ...settings, aiConfidenceThreshold: Number(e.target.value) })}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>50% (Permissive)</span>
                  <span>70% (Recommended)</span>
                  <span>95% (Strict Evidence Only)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            9. SYSTEM HEALTH & SECURITY
        ══════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'health' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 heading-serif flex items-center space-x-2">
                  <HeartPulse className="h-5 w-5 text-teal-600" />
                  <span>System Diagnostics & Live Service Health</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Real-time daemon statuses, database telemetry, and uptime</p>
              </div>

              <button
                onClick={() => api.getSystemHealth().then(setSystemHealth)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center space-x-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Diagnostics</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {systemHealth?.services?.map((svc: any) => (
                <div key={svc.name} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{svc.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{svc.detail}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    svc.status === 'OPERATIONAL'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                  }`}>
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>

            {systemHealth?.summary && (
              <div className="glass-card p-4 space-y-2 text-xs">
                <h3 className="font-bold text-slate-900 heading-serif">Runtime Environment Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                  <div>Uptime: <strong className="text-slate-900">{Math.round(systemHealth.summary.uptime)}s</strong></div>
                  <div>Node: <strong className="text-slate-900">{systemHealth.summary.nodeVersion}</strong></div>
                  <div>Environment: <strong className="text-slate-900">{systemHealth.summary.environment}</strong></div>
                  <div>Active Records: <strong className="text-slate-900">{systemHealth.summary.dbRecords}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            10. GENERAL / HOSPITAL / NOTIFICATIONS / PROCEDURES (Default Fallback View)
        ══════════════════════════════════════════════════════════════════════ */}
        {['general', 'hospital', 'departments', 'procedures', 'schedules', 'notifications', 'security'].includes(activeSection) && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl font-black text-slate-900 heading-serif capitalize flex items-center space-x-2">
                <Settings className="h-5 w-5 text-teal-600" />
                <span>{activeSection.replace('-', ' ')} Settings</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Enterprise configuration values and master hospital parameters</p>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hospital Organization Name</label>
                  <input
                    type="text"
                    value={settings.hospitalName || 'SmartOT Command Central Hospital'}
                    onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Facility Registry Code</label>
                  <input
                    type="text"
                    value={settings.hospitalCode || 'HOSP-BLR-01'}
                    onChange={(e) => setSettings({ ...settings, hospitalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Operating Timezone</label>
                  <input
                    type="text"
                    value={settings.timezone || 'Asia/Kolkata'}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">OT Delay Warning Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={settings.otDelayWarningMinutes || 10}
                    onChange={(e) => setSettings({ ...settings, otDelayWarningMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition"
                >
                  Save Parameters
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}

      {/* Add OT Modal */}
      <DetailModal
        isOpen={isAddOTModalOpen}
        onClose={() => setIsAddOTModalOpen(false)}
        title="Add New Operating Theatre"
        subtitle="Register surgical room into master hospital inventory"
      >
        <form onSubmit={handleCreateOT} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">OT Code (e.g. OT-05)</label>
              <input
                type="text"
                required
                value={otForm.code}
                onChange={(e) => setOtForm({ ...otForm, code: e.target.value.toUpperCase() })}
                placeholder="OT-05"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Suite Name</label>
              <input
                type="text"
                required
                value={otForm.name}
                onChange={(e) => setOtForm({ ...otForm, name: e.target.value })}
                placeholder="Cardiac Hybrid Suite"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Designated Specialty</label>
              <select
                value={otForm.specialty}
                onChange={(e) => setOtForm({ ...otForm, specialty: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="General Surgery">General Surgery</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Cardiothoracic">Cardiothoracic</option>
                <option value="Neurosurgery">Neurosurgery</option>
                <option value="Pediatric">Pediatric</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Turnover (Min)</label>
              <input
                type="number"
                value={otForm.expectedTurnoverMinutes}
                onChange={(e) => setOtForm({ ...otForm, expectedTurnoverMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Facility Location</label>
            <input
              type="text"
              value={otForm.location}
              onChange={(e) => setOtForm({ ...otForm, location: e.target.value })}
              placeholder="Building A, 2nd Floor, Wing C"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddOTModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700"
            >
              Create Operating Theatre
            </button>
          </div>
        </form>
      </DetailModal>

      {/* Edit OT Modal */}
      <DetailModal
        isOpen={isEditOTModalOpen}
        onClose={() => setIsEditOTModalOpen(false)}
        title={selectedOT ? `Edit Theatre ${selectedOT.code}` : ''}
      >
        {selectedOT && (
          <form onSubmit={handleUpdateOT} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Theatre Name</label>
              <input
                type="text"
                value={selectedOT.name}
                onChange={(e) => setSelectedOT({ ...selectedOT, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Specialty</label>
                <input
                  type="text"
                  value={selectedOT.specialty}
                  onChange={(e) => setSelectedOT({ ...selectedOT, specialty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Turnover Target (Min)</label>
                <input
                  type="number"
                  value={selectedOT.expectedTurnoverMinutes}
                  onChange={(e) => setSelectedOT({ ...selectedOT, expectedTurnoverMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditOTModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </DetailModal>

      {/* Add CSSD Pack Modal */}
      <DetailModal
        isOpen={isAddPackModalOpen}
        onClose={() => setIsAddPackModalOpen(false)}
        title="Register CSSD Sterile Pack"
        subtitle="Autoclave sterilization & expiry validation"
      >
        <form onSubmit={handleCreatePack} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pack ID (e.g. CSSD-030)</label>
              <input
                type="text"
                required
                value={packForm.packId}
                onChange={(e) => setPackForm({ ...packForm, packId: e.target.value.toUpperCase() })}
                placeholder="CSSD-030"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Set Type</label>
              <select
                value={packForm.packType}
                onChange={(e) => setPackForm({ ...packForm, packType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="Appendectomy Set">Appendectomy Set</option>
                <option value="Laparotomy Major Set">Laparotomy Major Set</option>
                <option value="Orthopedic Arthroplasty Set">Orthopedic Arthroplasty Set</option>
                <option value="Cardiac Bypass Tray">Cardiac Bypass Tray</option>
                <option value="Craniotomy Specialized Set">Craniotomy Specialized Set</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sterilization Date</label>
              <input
                type="date"
                required
                value={packForm.sterilizedAt}
                onChange={(e) => setPackForm({ ...packForm, sterilizedAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Barrier Expiry Date</label>
              <input
                type="date"
                required
                value={packForm.expiresAt}
                onChange={(e) => setPackForm({ ...packForm, expiresAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Storage Location Shelf</label>
            <input
              type="text"
              value={packForm.currentLocation}
              onChange={(e) => setPackForm({ ...packForm, currentLocation: e.target.value })}
              placeholder="CSSD Sterile Storage Shelf A-1"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddPackModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700"
            >
              Register Sterile Pack
            </button>
          </div>
        </form>
      </DetailModal>

      {/* Add Patient Modal */}
      <DetailModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        title="Admit Inpatient Record"
        subtitle="Create synthetic clinical admission for surgery scheduling"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Medical Record Number (MRN)</label>
              <input
                type="text"
                required
                value={patientForm.mrn}
                onChange={(e) => setPatientForm({ ...patientForm, mrn: e.target.value.toUpperCase() })}
                placeholder="P-1050"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Patient Full Name</label>
              <input
                type="text"
                required
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Age</label>
              <input
                type="number"
                value={patientForm.age}
                onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pre-Op Ward</label>
              <select
                value={patientForm.wardId}
                onChange={(e) => setPatientForm({ ...patientForm, wardId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="Ward 4B">Ward 4B (Pre-Op Demo)</option>
                <option value="Ward 3A">Ward 3A (General)</option>
                <option value="Ward 5C">Ward 5C (Orthopedics)</option>
                <option value="Ward 5A">Ward 5A (Cardio)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Primary Diagnosis / Procedure</label>
            <input
              type="text"
              required
              value={patientForm.primaryDiagnosis}
              onChange={(e) => setPatientForm({ ...patientForm, primaryDiagnosis: e.target.value })}
              placeholder="Acute Appendicitis"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddPatientModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700"
            >
              Save Patient Record
            </button>
          </div>
        </form>
      </DetailModal>

      {/* Add User Modal */}
      <DetailModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add Staff User Persona"
        subtitle="Provision role-based access for hospital team members"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Staff Name</label>
              <input
                type="text"
                required
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Dr. Emily Watson"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email / Login ID</label>
              <input
                type="email"
                required
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="emily.watson@hospital.demo"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">RBAC Role</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                <option value="OT_MANAGER">OT_MANAGER</option>
                <option value="CSSD_STAFF">CSSD_STAFF</option>
                <option value="WARD_STAFF">WARD_STAFF</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Department</label>
              <input
                type="text"
                value={userForm.department}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                placeholder="Surgical Suite"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700"
            >
              Provision Account
            </button>
          </div>
        </form>
      </DetailModal>

      {/* Double Confirmation Demo Reset Modal */}
      <DetailModal
        isOpen={isResetConfirmModalOpen}
        onClose={() => {
          setIsResetConfirmModalOpen(false);
          setResetConfirmInput('');
        }}
        title="Reset Demo Environment"
        subtitle="Restore baseline synthetic database"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4" />
              <span>Destructive Action Confirmation</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Resetting demo data will restore predefined synthetic operating theatres, pre-op readiness states, sterile packs, and sample surgery delays. All live changes made during this session will be restored to clean baseline state.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Type <span className="font-mono text-rose-600 font-extrabold">RESET DEMO</span> to confirm:
            </label>
            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="RESET DEMO"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-rose-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-600"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsResetConfirmModalOpen(false);
                setResetConfirmInput('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleResetDemo}
              disabled={resetConfirmInput !== 'RESET DEMO' || isLoading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition disabled:opacity-40"
            >
              {isLoading ? 'Resetting...' : 'Confirm Demo Reset'}
            </button>
          </div>
        </div>
      </DetailModal>

      {/* ─── Permission Denied Access Restrict Modal ─────────────────── */}
      <DetailModal
        isOpen={isPermissionDeniedModalOpen}
        onClose={() => setIsPermissionDeniedModalOpen(false)}
        title="Administrator Permission Required"
        subtitle="Action Restricted by Healthcare Security & RBAC Policies"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start space-x-3 shadow-sm">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-extrabold text-rose-950 text-sm">
                Restricted Action: {restrictedActionName || 'Configuration / Data Mutation'}
              </h5>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Hospital operational governance prohibits non-administrative roles from modifying master clinical records, reconfiguring alarm thresholds, or triggering destructive database operations.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Current User:</span>
              <span className="font-bold text-slate-900">{user?.name || 'Staff Member'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Current Role:</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {user?.role || 'NON_ADMIN'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Required Permission:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ADMINISTRATOR
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              If you are testing administrator capabilities, click below to switch to the pre-authorized Hospital Administrator account (Dr. Sarah Jenkins).
            </span>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setIsPermissionDeniedModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            >
              Dismiss
            </button>
            <button
              onClick={async () => {
                setIsPermissionDeniedModalOpen(false);
                await quickLoginAs('ADMINISTRATOR');
                showNotification('success', 'Session elevated to Administrator. You now have full write permissions.');
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Elevate to Administrator Role</span>
            </button>
          </div>
        </div>
      </DetailModal>
    </div>
  );
};

