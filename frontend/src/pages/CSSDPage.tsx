import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import { useAuth } from '../stores/auth.store';
import { PackQRCode } from '../components/PackQRCode';
import { HandheldSterileHub } from '../components/handheld/HandheldSterileHub';
import {
  CSSDItem,
  SterilizationJob,
  SterilizationCycleProfile,
  CSSDMetrics,
  CSSDPackStatus,
  SterilizationJobStatus,
  QRVerificationResult,
  Surgery,
  CSSDItemEvent,
} from '../../../shared/src/types';
import {
  PackageCheck,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Play,
  CheckSquare,
  ShieldAlert,
  Flame,
  FileCheck,
  Layers,
  Sparkles,
  Info,
  Building2,
  Calendar,
  UserCheck,
  Send,
  RefreshCw,
  PlusCircle,
  Eye,
  Camera,
  CameraOff,
  WifiOff,
  History,
  Lock,
  Keyboard,
  Smartphone,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

type CSSDSubTab = 'inventory' | 'queue' | 'history' | 'scanner';

const PAGE_QR_READER_ID = 'html5qr-reader-cssd-page';

export const CSSDPage: React.FC = () => {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();

  // Role Permissions
  const isCSSDPersonnel = ['CSSD_STAFF', 'CSSD_SUPERVISOR', 'CSSD_TECH', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const isOTStaff = ['NURSE', 'OT_NURSE', 'SURGEON', 'ANESTHESIOLOGIST', 'WARD_STAFF'].includes(userRole);

  const [activeTab, setActiveTab] = useState<CSSDSubTab>('inventory');

  // Core Data States
  const [items, setItems] = useState<CSSDItem[]>([]);
  const [jobs, setJobs] = useState<SterilizationJob[]>([]);
  const [metrics, setMetrics] = useState<CSSDMetrics | null>(null);
  const [cycleProfiles, setCycleProfiles] = useState<SterilizationCycleProfile[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [otFilter, setOtFilter] = useState('ALL');
  const [queueSortBy, setQueueSortBy] = useState<'oldest' | 'newest' | 'expected'>('newest');

  // Modal / Drawer Selection States
  const [showHandheldHub, setShowHandheldHub] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<CSSDItem | null>(null);
  const [selectedItemForSterilization, setSelectedItemForSterilization] = useState<CSSDItem | null>(null);
  const [selectedJobForRelease, setSelectedJobForRelease] = useState<SterilizationJob | null>(null);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<SterilizationJob | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<CSSDItem | null>(null);
  const [itemHistoryModal, setItemHistoryModal] = useState<{ item: CSSDItem | null; events: CSSDItemEvent[] } | null>(null);
  const [rbacErrorModal, setRbacErrorModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Form States for "Send for Sterilization"
  const [sendForm, setSendForm] = useState({
    sourceOT: 'OT-03',
    associatedSurgeryId: '',
    method: 'Steam Autoclave Standard (134°C)',
    condition: 'EXCELLENT',
    notes: '',
  });
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSubmittingSend, setIsSubmittingSend] = useState(false);

  // Form States for "Release Verification Check"
  const [releaseForm, setReleaseForm] = useState({
    cycleCompleted: true,
    packagingAcceptable: true,
    indicatorVerified: true,
    releaseDecision: 'RELEASED' as 'RELEASED' | 'REJECTED' | 'QUARANTINED',
    notes: '',
  });
  const [isSubmittingRelease, setIsSubmittingRelease] = useState(false);

  // Scanner Subtab State
  const [scannerMode, setScannerMode] = useState<'camera' | 'manual'>('camera');
  const [scannerInput, setScannerInput] = useState('SET-021');
  const [qrScanResult, setQrScanResult] = useState<QRVerificationResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const handleScanRef = useRef<(codeToScan: string) => void>(() => {});

  // ─── DATA LOADING ────────────────────────────────────────────────────────
  const loadCSSDData = async () => {
    setIsLoading(true);
    try {
      const [fetchedItems, fetchedPacks, fetchedJobs, fetchedMetrics, fetchedProfiles, fetchedSchedule] = await Promise.all([
        api.getCSSDItems().catch(() => []),
        api.getCSSDPacks().catch(() => []),
        api.getCSSDSterilizationJobs().catch(() => []),
        api.getCSSDMetrics().catch(() => null),
        api.getCSSDCycleProfiles().catch(() => []),
        api.getOTSchedule().catch(() => []),
      ]);

      let finalItems: CSSDItem[] = Array.isArray(fetchedItems) ? fetchedItems : [];
      if (finalItems.length === 0 && Array.isArray(fetchedPacks) && fetchedPacks.length > 0) {
        finalItems = fetchedPacks.map((p: any) => ({
          id: p.id,
          name: p.packType || 'Instrument Set',
          qrCode: p.packId || p.id,
          category: 'Instrument Set',
          quantity: 1,
          location: p.currentLocation || 'CSSD Storage',
          currentStatus: p.currentStatus === 'STERILIZED' || p.currentStatus === 'AVAILABLE' ? 'STERILE' : (p.currentStatus as any),
          lastSterilizedAt: p.sterilizedAt,
          cycleReference: p.sterilizationBatch,
          condition: 'EXCELLENT',
          assignedOtId: p.assignedOtId,
          assignedSurgeryId: p.assignedSurgeryId,
          assignedPatientId: p.assignedPatientId,
          notes: p.notes,
          createdAt: p.sterilizedAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }));
      }

      setItems(finalItems);
      setJobs(Array.isArray(fetchedJobs) ? fetchedJobs : []);
      setMetrics(fetchedMetrics || null);
      setCycleProfiles(Array.isArray(fetchedProfiles) ? fetchedProfiles : []);
      setSurgeries(Array.isArray(fetchedSchedule) ? fetchedSchedule : []);
    } catch (err) {
      console.error('Failed to load CSSD telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCSSDData();
  }, []);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const handlePerformQRScan = async (codeToScan: string) => {
    if (!codeToScan.trim()) return;

    // Offline Safety Check
    if (!navigator.onLine) {
      setQrScanResult({
        valid: false,
        packId: codeToScan,
        status: 'BLOCKED',
        message: 'Offline — Cannot retrieve live item state',
        reasons: ['Network disconnected. SmartOT central database is unreachable.'],
        suggestedAction: 'Check network connection and retry scan when online.',
      });
      return;
    }

    setIsScanning(true);
    try {
      const res = await api.getCSSDItemByQR(codeToScan.trim());
      const verification = res?.data?.verification || res?.data || res;
      setQrScanResult(verification);
    } catch (err: any) {
      console.error('QR Verification API call failed:', err);
      setQrScanResult({
        valid: false,
        packId: codeToScan,
        status: 'BLOCKED',
        message: 'Instrument Not Found',
        reasons: [err?.message || 'Failed to query SmartOT central database.'],
        suggestedAction: 'Verify physical QR label or register item in Admin settings.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  handleScanRef.current = handlePerformQRScan;

  // ─── CAMERA SCANNER LIFECYCLE ─────────────────────────────────────────────
  const stopTabCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      try { await html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startTabCamera = useCallback(async () => {
    setCameraError(null);
    setCameraActive(false);

    try {
      if (html5QrRef.current) {
        try { await html5QrRef.current.stop(); } catch {}
        try { await html5QrRef.current.clear(); } catch {}
        html5QrRef.current = null;
      }

      const domElem = document.getElementById(PAGE_QR_READER_ID);
      if (!domElem) {
        setCameraError('Viewfinder element loading... Click Retry.');
        return;
      }

      const scanner = new Html5Qrcode(PAGE_QR_READER_ID, { verbose: false });
      html5QrRef.current = scanner;

      let cameraConfig: any = { facingMode: 'environment' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment') || c.label.toLowerCase().includes('rear')
          );
          cameraConfig = backCam ? backCam.id : cameras[0].id;
        }
      } catch (e) {
        console.warn('Could not enumerate cameras, falling back to facingMode constraint', e);
      }

      const onScanSuccess = (decodedText: string) => {
        const now = Date.now();
        if (lastScannedRef.current.code === decodedText && now - lastScannedRef.current.time < 3000) {
          return; // Prevent duplicate scan within 3 seconds
        }
        lastScannedRef.current = { code: decodedText, time: now };

        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          }
        } catch (e) {}

        let packId = decodedText.trim();
        if (packId.startsWith('{')) {
          try {
            const parsed = JSON.parse(packId);
            packId = parsed.packId || parsed.id || parsed.qrCode || packId;
          } catch {}
        }
        if (packId.startsWith('http')) {
          try {
            const url = new URL(packId);
            packId = url.searchParams.get('packId') || url.searchParams.get('qrCode') || url.pathname.split('/').pop() || packId;
          } catch {}
        }

        setScannerInput(packId);
        if (handleScanRef.current) {
          handleScanRef.current(packId);
        }
      };

      try {
        await scanner.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          onScanSuccess,
          () => {}
        );
      } catch (firstErr) {
        console.warn('First camera config failed, retrying with facingMode user...', firstErr);
        await scanner.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          onScanSuccess,
          () => {}
        );
      }

      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setCameraError('Camera permission denied. Please allow camera access in browser settings or use manual input below.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraError('No camera detected on this device. Use manual code input below.');
      } else {
        setCameraError(`Camera error: ${msg}. Try manual code entry below.`);
      }
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'scanner' && scannerMode === 'camera') {
      const t = setTimeout(() => startTabCamera(), 200);
      return () => {
        clearTimeout(t);
        stopTabCamera();
      };
    }
    stopTabCamera();
  }, [activeTab, scannerMode, startTabCamera, stopTabCamera]);

  const handleSendForSterilizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForSterilization) return;
    setSendError(null);
    setIsSubmittingSend(true);

    try {
      await api.createSterilizationJob({
        instrumentId: selectedItemForSterilization.id,
        qrCode: selectedItemForSterilization.qrCode,
        quantity: selectedItemForSterilization.quantity,
        currentLocation: selectedItemForSterilization.location,
        sourceOT: sendForm.sourceOT,
        associatedSurgeryId: sendForm.associatedSurgeryId || undefined,
        method: sendForm.method,
        notes: sendForm.notes,
      });

      setSelectedItemForSterilization(null);
      await loadCSSDData();
      setActiveTab('queue');
    } catch (err: any) {
      setSendError(err.message || 'Cannot create sterilization request.');
    } finally {
      setIsSubmittingSend(false);
    }
  };

  const handleStartProcessing = async (jobId: string, method?: string) => {
    if (!isCSSDPersonnel) {
      setRbacErrorModal(`Role "${user?.role || 'OT Staff'}" is not authorized to start sterilization cycles. CSSD staff permission required.`);
      return;
    }
    try {
      await api.startSterilizationJob(jobId, { method });
      await loadCSSDData();
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('FORBIDDEN') || err.message?.includes('authorized')) {
        setRbacErrorModal(err.message);
      } else {
        alert(`Failed to start sterilization cycle: ${err.message}`);
      }
    }
  };

  const handleCompleteProcessing = async (jobId: string) => {
    if (!isCSSDPersonnel) {
      setRbacErrorModal(`Role "${user?.role || 'OT Staff'}" is not authorized to declare sterilization complete. CSSD staff permission required.`);
      return;
    }
    try {
      await api.completeSterilizationJob(jobId);
      await loadCSSDData();
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('FORBIDDEN') || err.message?.includes('authorized')) {
        setRbacErrorModal(err.message);
      } else {
        alert(`Failed to complete sterilization cycle: ${err.message}`);
      }
    }
  };

  const handleReleaseCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForRelease) return;
    if (!isCSSDPersonnel) {
      setRbacErrorModal(`Role "${user?.role || 'OT Staff'}" is not authorized to perform quality release verification. CSSD staff permission required.`);
      return;
    }
    setIsSubmittingRelease(true);

    try {
      const targetJob = selectedJobForRelease;
      const targetDecision = releaseForm.releaseDecision;
      await api.releaseSterilizationJob(targetJob.id, releaseForm);
      setSelectedJobForRelease(null);

      const updatedItems = await api.getCSSDItems();
      setItems(updatedItems);
      await loadCSSDData();

      if (targetDecision === 'RELEASED') {
        const releasedItem = updatedItems.find(
          (i) => i.id === targetJob.instrumentId || i.qrCode === targetJob.qrCode
        );
        if (releasedItem) {
          setSelectedQRItem(releasedItem);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('FORBIDDEN') || err.message?.includes('authorized')) {
        setRbacErrorModal(err.message);
      } else {
        alert(`Release verification failed: ${err.message}`);
      }
    } finally {
      setIsSubmittingRelease(false);
    }
  };

  const handleViewFullHistory = async (item: CSSDItem) => {
    try {
      const historyEvents = await api.getCSSDItemHistory(item.id);
      setItemHistoryModal({ item, events: historyEvents || [] });
    } catch (err) {
      alert(`Failed to fetch history events: ${err}`);
    }
  };

  const handleTransitionPack = async (item: CSSDItem, targetStatus: CSSDPackStatus) => {
    if (!isCSSDPersonnel) {
      setRbacErrorModal(`Role "${user?.role || 'Staff'}" is not authorized to transition sterile pack lifecycle. CSSD staff permission required.`);
      return;
    }
    try {
      await api.transitionCSSDPack(item.qrCode || item.id, {
        targetStatus,
      });
      await loadCSSDData();
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('FORBIDDEN') || err.message?.includes('authorized')) {
        setRbacErrorModal(err.message);
      } else {
        alert(`Failed to transition pack status: ${err?.message || err}`);
      }
    }
  };

  // ─── FILTERED DATA COMPUTATION ──────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.cycleReference && item.cycleReference.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.currentStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        job.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.instrumentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.cycleReference && job.cycleReference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
      const matchesOT = otFilter === 'ALL' || job.sourceOT === otFilter;
      return matchesSearch && matchesStatus && matchesOT;
    })
    .sort((a, b) => {
      if (queueSortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (queueSortBy === 'expected') {
        const aExp = a.expectedCompletionAt ? new Date(a.expectedCompletionAt).getTime() : 9999999999999;
        const bExp = b.expectedCompletionAt ? new Date(b.expectedCompletionAt).getTime() : 9999999999999;
        return aExp - bExp;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const categoriesList = [
    'Surgical Instrument',
    'Instrument Set',
    'Surgical Tray',
    'Reusable Device',
    'Endoscopy Equipment',
    'Metal Instrument',
    'Specialized Instrument',
    'Other',
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-rose-600 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <WifiOff className="h-5 w-5 animate-pulse" />
            <div>
              <span className="font-bold text-xs block">Offline Mode Active</span>
              <span className="text-[11px] text-rose-100">
                Network connection unavailable. Live database state queries and sterilization mutations are paused.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── HEADER & REAL-TIME KPI STRIP ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 heading-serif flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-md">
              <PackageCheck className="h-6 w-6" />
            </div>
            <span>CSSD Instrument Lifecycle & Sterilization Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
            <span>Central Sterile Supply Department — Camera QR Tracking & Quality Sign-Off</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold uppercase">
              Role: {user?.role || 'Staff'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={() => setShowHandheldHub(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-teal-400 hover:bg-slate-800 font-bold text-xs flex items-center space-x-2 shadow-md transition"
          >
            <Smartphone className="h-4 w-4 text-teal-400" />
            <span>Handheld Mobile Hub</span>
          </button>

          <button
            onClick={loadCSSDData}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-2 shadow-sm transition"
          >
            <RefreshCw className={`h-4 w-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Database</span>
          </button>
        </div>
      </motion.div>

      {/* Metrics Banner Cards */}
      {metrics && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Sterile Available</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.sterileItemsAvailable}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Ready for surgical use</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Queued for Cycle</span>
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.waitingForSterilization}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Awaiting load</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-blue-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Processing</span>
              <Flame className="h-4 w-4 animate-pulse" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.currentlyProcessing}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Active chamber</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Release Pending</span>
              <FileCheck className="h-4 w-4" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.releasePending}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">QA sign-off</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-indigo-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Completed Today</span>
              <UserCheck className="h-4 w-4" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.completedToday}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Released 24h</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-rose-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Rejected/Quarantined</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.rejectedOrQuarantined}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Failed check</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Avg Duration</span>
              <Sparkles className="h-4 w-4 text-teal-600" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{metrics.averageProcessingTimeMinutes}m</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Benchmark: 45m</span>
          </div>
        </motion.div>
      )}

      {/* ─── CSSD SUB-NAVIGATION TABS (Requirement #2) ───────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          <span>Sterile Inventory</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-white">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Sterilization Queue</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 font-bold">
            {jobs.filter((j) => ['QUEUED', 'PROCESSING', 'RELEASE_PENDING'].includes(j.status)).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Sterilization History</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'scanner'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>QR Scanner</span>
        </button>
      </motion.div>

      {/* ─── TAB 1: STERILE INVENTORY PAGE ─────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search instrument name, QR (e.g. SET-021), cycle ref..."
                className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 w-full"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="STERILE">STERILE</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_USE">IN_USE</option>
                <option value="RETURNED_TO_CSSD">RETURNED_TO_CSSD</option>
                <option value="QUEUED">QUEUED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="RELEASE_PENDING">RELEASE_PENDING</option>
                <option value="QUARANTINED">QUARANTINED</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Instrument / Pack Name</th>
                    <th className="py-3.5 px-4">Unique QR ID</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Qty</th>
                    <th className="py-3.5 px-4">Storage Location</th>
                    <th className="py-3.5 px-4">Current Status</th>
                    <th className="py-3.5 px-4">Last Sterilized</th>
                    <th className="py-3.5 px-4">Sterilization Method</th>
                    <th className="py-3.5 px-4">Released By</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredItems.map((item) => {
                    const isTargetDemo = item.qrCode === 'SET-021';
                    const isEligibleForSterilization = [
                      'RETURNED_TO_CSSD',
                      'RETURNED',
                      'IN_USE',
                      'AVAILABLE',
                      'STERILE',
                      'REJECTED',
                    ].includes(item.currentStatus);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemForDetail(item)}
                        className={`hover:bg-slate-50 transition cursor-pointer group ${
                          isTargetDemo ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 group-hover:text-teal-700 transition">
                              {item.name}
                            </span>
                            {isTargetDemo && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                DEMO TARGET
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQRItem(item);
                            }}
                            className="font-mono font-bold text-teal-700 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 hover:bg-teal-100 transition inline-flex items-center space-x-1"
                          >
                            <QrCode className="h-3 w-3" />
                            <span>{item.qrCode}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800">{item.quantity}</td>

                        <td className="py-3.5 px-4 text-slate-700">{item.location}</td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.currentStatus} pulse={item.currentStatus === 'PROCESSING'} />
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {item.lastSterilizedAt ? new Date(item.lastSterilizedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 truncate max-w-[140px]" title={item.sterilizationMethod}>
                          {item.sterilizationMethod || 'Steam Standard 134C'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {item.releasedBy || 'CSSD Staff'}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewFullHistory(item)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold transition inline-flex items-center space-x-1"
                          >
                            <History className="h-3 w-3" />
                            <span>History</span>
                          </button>

                          {/* Complete Pack Lifecycle Action Buttons */}
                          {item.currentStatus === 'COLLECTED' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'STERILIZING')}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <Play className="h-3 w-3" />
                              <span>Start Sterilizing</span>
                            </button>
                          )}

                          {item.currentStatus === 'STERILIZING' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'STERILIZED')}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <CheckSquare className="h-3 w-3" />
                              <span>Mark Sterilized</span>
                            </button>
                          )}

                          {item.currentStatus === 'STERILIZED' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'STORED')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <Layers className="h-3 w-3" />
                              <span>Store Pack</span>
                            </button>
                          )}

                          {item.currentStatus === 'STORED' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'AVAILABLE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Available</span>
                            </button>
                          )}

                          {item.currentStatus === 'ASSIGNED' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'IN_USE')}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <ArrowRight className="h-3 w-3" />
                              <span>Mark In Use</span>
                            </button>
                          )}

                          {item.currentStatus === 'IN_USE' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'RETURNED')}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Mark Returned</span>
                            </button>
                          )}

                          {(item.currentStatus === 'RETURNED' || item.currentStatus === 'RETURNED_TO_CSSD') && (
                            <button
                              onClick={() => handleTransitionPack(item, 'REPROCESSING')}
                              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Reprocess</span>
                            </button>
                          )}

                          {item.currentStatus === 'REPROCESSING' && (
                            <button
                              onClick={() => handleTransitionPack(item, 'COLLECTED')}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <PackageCheck className="h-3 w-3" />
                              <span>Recollect</span>
                            </button>
                          )}

                          {(item.currentStatus === 'EXPIRED' || item.currentStatus === 'BLOCKED') && (
                            <button
                              onClick={() => handleTransitionPack(item, 'REPROCESSING')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Send to Reprocess</span>
                            </button>
                          )}

                          {isEligibleForSterilization && (
                            <button
                              onClick={() => {
                                setSelectedItemForSterilization(item);
                                setSendForm((prev) => ({
                                  ...prev,
                                  associatedSurgeryId: item.assignedSurgeryId || '',
                                }));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <Send className="h-3 w-3" />
                              <span>Send for Sterilization</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── TAB 2: STERILIZATION QUEUE PAGE ─────────────────────────────────── */}
      {activeTab === 'queue' && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Job ID (J-101), Instrument, Submitted By..."
                className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 w-full"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Queue Statuses</option>
                <option value="QUEUED">QUEUED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="RELEASE_PENDING">RELEASE_PENDING</option>
                <option value="RELEASED">RELEASED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="QUARANTINED">QUARANTINED</option>
              </select>

              <select
                value={otFilter}
                onChange={(e) => setOtFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Source OTs</option>
                <option value="OT-01">OT-01</option>
                <option value="OT-02">OT-02</option>
                <option value="OT-03">OT-03</option>
                <option value="OT-04">OT-04</option>
                <option value="Central CSSD">Central CSSD</option>
              </select>

              <select
                value={queueSortBy}
                onChange={(e: any) => setQueueSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="expected">Sort: Expected Completion</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Job ID</th>
                    <th className="py-3.5 px-4">Instrument / Pack</th>
                    <th className="py-3.5 px-4">QR ID</th>
                    <th className="py-3.5 px-4">Source OT / Surgery</th>
                    <th className="py-3.5 px-4">Submitted By</th>
                    <th className="py-3.5 px-4">Current Status</th>
                    <th className="py-3.5 px-4">Method & Cycle</th>
                    <th className="py-3.5 px-4">Expected Completion</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredJobs.map((job) => {
                    const isProcessing = job.status === 'PROCESSING';
                    const isQueued = job.status === 'QUEUED' || job.status === 'RECEIVED';
                    const isReleasePending = job.status === 'RELEASE_PENDING' || job.status === 'COMPLETED';

                    let completionLabel = 'N/A';
                    let isOverrun = false;
                    if (isProcessing && job.expectedCompletionAt) {
                      const expTime = new Date(job.expectedCompletionAt).getTime();
                      const nowTime = new Date().getTime();
                      const diffMins = Math.round((expTime - nowTime) / 60000);
                      if (diffMins < 0) {
                        isOverrun = true;
                        completionLabel = `Delayed by ${Math.abs(diffMins)}m`;
                      } else {
                        completionLabel = `${diffMins}m remaining (${new Date(job.expectedCompletionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                      }
                    } else if (job.processingCompletedAt) {
                      completionLabel = `Done at ${new Date(job.processingCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }

                    return (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJobForDetail(job)}
                        className={`hover:bg-slate-50 transition cursor-pointer group ${
                          isOverrun ? 'bg-rose-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-extrabold text-teal-700">{job.jobId}</td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">{job.instrumentName}</td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{job.qrCode}</td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{job.sourceOT || job.sourceDepartment}</span>
                            {job.associatedSurgeryName && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {job.associatedSurgeryName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{job.submittedBy}</td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={job.status} pulse={isProcessing} />
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-medium truncate max-w-[140px]">{job.method}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{job.cycleReference}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className={`text-xs font-bold ${
                              isOverrun ? 'text-rose-600 animate-pulse' : 'text-slate-700'
                            }`}
                          >
                            {completionLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          {isQueued && (
                            <button
                              onClick={() => handleStartProcessing(job.id, job.method)}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <Play className="h-3 w-3" />
                              <span>Start Cycle</span>
                            </button>
                          )}

                          {isProcessing && (
                            <button
                              onClick={() => handleCompleteProcessing(job.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <CheckSquare className="h-3 w-3" />
                              <span>Complete Cycle</span>
                            </button>
                          )}

                          {isReleasePending && (
                            <button
                              onClick={() => {
                                setSelectedJobForRelease(job);
                                setReleaseForm({
                                  cycleCompleted: true,
                                  packagingAcceptable: true,
                                  indicatorVerified: true,
                                  releaseDecision: 'RELEASED',
                                  notes: '',
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow-sm inline-flex items-center space-x-1"
                            >
                              <FileCheck className="h-3 w-3" />
                              <span>Release Check</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedJobForDetail(job)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                          >
                            Timeline
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── TAB 3: STERILIZATION HISTORY PAGE ───────────────────────────── */}
      {activeTab === 'history' && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search historical jobs, QR, OT..."
                className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 w-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Job ID</th>
                    <th className="py-3.5 px-4">Instrument Name</th>
                    <th className="py-3.5 px-4">QR Code</th>
                    <th className="py-3.5 px-4">Sterilization Method</th>
                    <th className="py-3.5 px-4">Submitted By</th>
                    <th className="py-3.5 px-4">Released By</th>
                    <th className="py-3.5 px-4">Final Decision</th>
                    <th className="py-3.5 px-4 text-right">View Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJobForDetail(job)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-extrabold text-teal-700">{job.jobId}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{job.instrumentName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{job.qrCode}</td>
                      <td className="py-3.5 px-4 text-slate-700">{job.method}</td>
                      <td className="py-3.5 px-4 text-slate-600">{job.submittedBy}</td>
                      <td className="py-3.5 px-4 text-slate-600">{job.releasedBy || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedJobForDetail(job)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold transition text-xs"
                        >
                          Lifecycle Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── TAB 4: REAL CAMERA QR SCANNER PAGE (Requirements #1, #3, #4, #7, #23, #24) ─── */}
      {activeTab === 'scanner' && (
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-600">
                  <QrCode className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Physical Instrument QR Scanner</h2>
                  <p className="text-xs text-slate-500">
                    Point camera at permanent physical QR label to fetch current database state.
                  </p>
                </div>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setScannerMode('camera')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                    scannerMode === 'camera' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Camera</span>
                </button>
                <button
                  onClick={() => setScannerMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                    scannerMode === 'manual' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Manual Input</span>
                </button>
              </div>
            </div>

            {/* CAMERA VIEWFINDER SECTION */}
            {scannerMode === 'camera' && (
              <div className="space-y-3">
                <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-teal-500 bg-slate-900 min-h-[260px] flex flex-col items-center justify-center shadow-inner">
                  {/* Embedded Html5Qrcode reader element */}
                  <div id={PAGE_QR_READER_ID} className="w-full h-full text-slate-200 text-xs"></div>

                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-3">
                      <Camera className="h-10 w-10 text-teal-400 animate-pulse" />
                      <span className="text-xs text-slate-300 font-medium">Initializing camera viewfinder...</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center space-y-3 text-rose-300">
                      <CameraOff className="h-10 w-10 text-rose-500" />
                      <p className="text-xs font-semibold leading-relaxed">{cameraError}</p>
                      <button
                        onClick={() => startTabCamera()}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
                      >
                        Retry Camera Permission
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 max-w-sm mx-auto">
                  <span className="flex items-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="font-semibold text-emerald-700">Camera Active & Scanning</span>
                  </span>
                  <button
                    onClick={() => (cameraActive ? stopTabCamera() : startTabCamera())}
                    className="text-teal-700 font-bold hover:underline"
                  >
                    {cameraActive ? 'Pause Scanner' : 'Resume Scanner'}
                  </button>
                </div>
              </div>
            )}

            {/* MANUAL CODE INPUT SECTION */}
            {scannerMode === 'manual' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 max-w-md mx-auto">
                <label className="text-xs font-bold text-slate-700 block">Enter Permanent QR / Instrument ID</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePerformQRScan(scannerInput)}
                    placeholder="Enter QR (e.g. SET-021, INS-104, TRAY-005)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                  <button
                    onClick={() => handlePerformQRScan(scannerInput)}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Query Database
                  </button>
                </div>
              </div>
            )}

            {/* Quick Demo QR Selector Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Quick Demo Identifiers:</span>
              <button
                onClick={() => {
                  setScannerInput('SET-021');
                  handlePerformQRScan('SET-021');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-mono text-[11px] font-bold"
              >
                SET-021 (Target Set)
              </button>
              <button
                onClick={() => {
                  setScannerInput('INS-104');
                  handlePerformQRScan('INS-104');
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-mono text-[11px] font-bold"
              >
                INS-104 (Queued)
              </button>
              <button
                onClick={() => {
                  setScannerInput('TRAY-005');
                  handlePerformQRScan('TRAY-005');
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-mono text-[11px] font-bold"
              >
                TRAY-005 (Processing)
              </button>
              <button
                onClick={() => {
                  setScannerInput('INVALID-999');
                  handlePerformQRScan('INVALID-999');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-mono text-[11px] font-bold"
              >
                INVALID-999 (Unknown)
              </button>
            </div>
          </div>

          {/* QR SCAN RESULT OUTPUT CARD (Requirement #6 & #29) */}
          {qrScanResult && (
            <div className="space-y-4">
              {qrScanResult.valid ? (
                <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-extrabold text-teal-700 tracking-wider">
                          QR: {qrScanResult.packId}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {qrScanResult.pack ? ('name' in qrScanResult.pack ? qrScanResult.pack.name : qrScanResult.pack.packType) : 'Instrument Set'}
                        </h3>
                      </div>
                    </div>
                    <StatusBadge status={qrScanResult.pack?.currentStatus || 'STERILE'} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Current Storage / Location:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {qrScanResult.pack ? ('location' in qrScanResult.pack ? qrScanResult.pack.location : qrScanResult.pack.currentLocation) : 'CSSD Storage'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block">Sterilization Method:</span>
                      <span className="font-bold text-slate-900">
                        {qrScanResult.pack && 'sterilizationMethod' in qrScanResult.pack ? qrScanResult.pack.sterilizationMethod : 'Steam Autoclave Standard'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-800 flex items-center space-x-1">
                      <Sparkles className="h-4 w-4" />
                      <span>{qrScanResult.message}</span>
                    </span>
                    <p className="text-emerald-700">{qrScanResult.suggestedAction}</p>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => qrScanResult.pack && handleViewFullHistory(qrScanResult.pack as any)}
                      className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      <History className="h-4 w-4" />
                      <span>View Full Database History</span>
                    </button>

                    {/* Role-Based Send Action */}
                    {['RETURNED_TO_CSSD', 'RETURNED', 'IN_USE', 'AVAILABLE', 'STERILE', 'REJECTED'].includes(qrScanResult.pack?.currentStatus || '') && (
                      <button
                        onClick={() => {
                          if (qrScanResult.pack) {
                            setSelectedItemForSterilization(qrScanResult.pack as any);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Send for Sterilization</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white border-2 border-rose-500 shadow-lg space-y-3">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                    <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                      <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-extrabold text-rose-600">QR: {qrScanResult.packId}</span>
                      <h3 className="text-base font-extrabold text-slate-900">Instrument Not Found</h3>
                    </div>
                  </div>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                    <p className="font-bold">{qrScanResult.message}</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {qrScanResult.reasons?.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                    <p className="font-semibold pt-1">{qrScanResult.suggestedAction}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── MODAL 1: INSTRUMENT DETAIL MODAL ──────────────────────────────── */}
      <DetailModal
        isOpen={!!selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        title={selectedItemForDetail ? selectedItemForDetail.name : ''}
        subtitle={selectedItemForDetail ? `QR: ${selectedItemForDetail.qrCode} | Category: ${selectedItemForDetail.category}` : ''}
        maxWidth="max-w-xl"
      >
        {selectedItemForDetail && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                <StatusBadge status={selectedItemForDetail.currentStatus} />
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Condition</span>
                <span className="font-bold text-emerald-700">{selectedItemForDetail.condition}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1">Basic Information</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <p><span className="text-slate-400">Manufacturer:</span> <span className="font-bold">{selectedItemForDetail.manufacturer || 'Aesculap'}</span></p>
                <p><span className="text-slate-400">Model:</span> <span className="font-bold">{selectedItemForDetail.model || 'GEN-2026'}</span></p>
                <p><span className="text-slate-400">Serial Number:</span> <span className="font-mono font-bold">{selectedItemForDetail.serialNumber || 'SN-998811'}</span></p>
                <p><span className="text-slate-400">Quantity:</span> <span className="font-bold">{selectedItemForDetail.quantity}</span></p>
                <p><span className="text-slate-400">Location:</span> <span className="font-bold">{selectedItemForDetail.location}</span></p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1">Sterilization & Release Info</h4>
              <div className="space-y-1 text-slate-700">
                <p><span className="text-slate-400">Last Sterilized:</span> <span className="font-semibold">{selectedItemForDetail.lastSterilizedAt ? new Date(selectedItemForDetail.lastSterilizedAt).toLocaleString() : 'N/A'}</span></p>
                <p><span className="text-slate-400">Sterilization Method:</span> <span className="font-semibold">{selectedItemForDetail.sterilizationMethod || 'Steam Standard 134C'}</span></p>
                <p><span className="text-slate-400">Cycle Reference:</span> <span className="font-mono font-bold text-teal-700">{selectedItemForDetail.cycleReference || 'CYC-101'}</span></p>
                <p><span className="text-slate-400">Released By:</span> <span className="font-semibold">{selectedItemForDetail.releasedBy || 'CSSD Supervisor'}</span></p>
                <p><span className="text-slate-400">Release Time:</span> <span className="font-semibold">{selectedItemForDetail.releasedAt ? new Date(selectedItemForDetail.releasedAt).toLocaleString() : 'N/A'}</span></p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleViewFullHistory(selectedItemForDetail)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
              >
                <History className="h-4 w-4" />
                <span>View Full Database History</span>
              </button>
            </div>
          </div>
        )}
      </DetailModal>

      {/* ─── MODAL 2: SEND FOR STERILIZATION FORM MODAL ───────────────────── */}
      <DetailModal
        isOpen={!!selectedItemForSterilization}
        onClose={() => setSelectedItemForSterilization(null)}
        title={selectedItemForSterilization ? `Send for Sterilization: ${selectedItemForSterilization.name}` : ''}
        subtitle={selectedItemForSterilization ? `QR: ${selectedItemForSterilization.qrCode}` : ''}
        maxWidth="max-w-md"
      >
        {selectedItemForSterilization && (
          <form onSubmit={handleSendForSterilizationSubmit} className="space-y-4 text-xs">
            {sendError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-1">
                <span className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Cannot Create Request</span>
                </span>
                <p>{sendError}</p>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Source OT / Department</label>
              <select
                value={sendForm.sourceOT}
                onChange={(e) => setSendForm({ ...sendForm, sourceOT: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-teal-600"
              >
                <option value="OT-01">OT-01 (General Surgery)</option>
                <option value="OT-02">OT-02 (Orthopedics)</option>
                <option value="OT-03">OT-03 (Emergency Surgery)</option>
                <option value="OT-04">OT-04 (Cardiothoracic)</option>
                <option value="Central CSSD Intake">Central CSSD Intake</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Associated Surgery (Optional)</label>
              <select
                value={sendForm.associatedSurgeryId}
                onChange={(e) => setSendForm({ ...sendForm, associatedSurgeryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Select Surgery --</option>
                {surgeries.map((surg) => (
                  <option key={surg.id} value={surg.id}>
                    {surg.procedureName} ({surg.otCode || surg.otId}) - {surg.surgeonName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Configured Sterilization Cycle Profile</label>
              <select
                value={sendForm.method}
                onChange={(e) => setSendForm({ ...sendForm, method: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-teal-600"
              >
                {cycleProfiles.map((cp) => (
                  <option key={cp.id} value={cp.method}>
                    {cp.method} ({cp.totalExpectedDurationMinutes}m expected)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Submitted By (Authenticated Staff)</label>
              <input
                type="text"
                disabled
                value={user?.name || user?.email || 'Authenticated User'}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Notes / Instructions</label>
              <textarea
                value={sendForm.notes}
                onChange={(e) => setSendForm({ ...sendForm, notes: e.target.value })}
                placeholder="Add special cleaning instructions or biological indicator notes..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingSend}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition"
            >
              {isSubmittingSend ? 'Creating Request...' : 'Confirm & Create Sterilization Job'}
            </button>
          </form>
        )}
      </DetailModal>

      {/* ─── MODAL 3: RELEASE VERIFICATION CHECK MODAL ────────────────────── */}
      <DetailModal
        isOpen={!!selectedJobForRelease}
        onClose={() => setSelectedJobForRelease(null)}
        title={selectedJobForRelease ? `Release Check: Job ${selectedJobForRelease.jobId}` : ''}
        subtitle={selectedJobForRelease ? `Instrument: ${selectedJobForRelease.instrumentName} (${selectedJobForRelease.qrCode})` : ''}
        maxWidth="max-w-md"
      >
        {selectedJobForRelease && (
          <form onSubmit={handleReleaseCheckSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 space-y-1">
              <span className="font-bold flex items-center space-x-1">
                <FileCheck className="h-4 w-4" />
                <span>Quality Control Release Check</span>
              </span>
              <p className="text-[11px]">
                Verify sterile barrier, chemical indicators, and chamber printout before releasing item to sterile store.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.cycleCompleted}
                  onChange={(e) => setReleaseForm({ ...releaseForm, cycleCompleted: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">Autoclave chamber cycle completed without errors</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.packagingAcceptable}
                  onChange={(e) => setReleaseForm({ ...releaseForm, packagingAcceptable: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">Pouch seal integrity & wrapper condition acceptable</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.indicatorVerified}
                  onChange={(e) => setReleaseForm({ ...releaseForm, indicatorVerified: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">Chemical / Biological indicator color verified</span>
              </label>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Release Decision</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReleaseForm({ ...releaseForm, releaseDecision: 'RELEASED' })}
                  className={`py-2 rounded-xl font-bold border text-xs transition ${
                    releaseForm.releaseDecision === 'RELEASED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  RELEASED
                </button>

                <button
                  type="button"
                  onClick={() => setReleaseForm({ ...releaseForm, releaseDecision: 'REJECTED' })}
                  className={`py-2 rounded-xl font-bold border text-xs transition ${
                    releaseForm.releaseDecision === 'REJECTED'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  REJECTED
                </button>

                <button
                  type="button"
                  onClick={() => setReleaseForm({ ...releaseForm, releaseDecision: 'QUARANTINED' })}
                  className={`py-2 rounded-xl font-bold border text-xs transition ${
                    releaseForm.releaseDecision === 'QUARANTINED'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  QUARANTINED
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Auditor / Released By</label>
              <input
                type="text"
                disabled
                value={user?.name || user?.email || 'CSSD Supervisor'}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Verification Notes</label>
              <textarea
                value={releaseForm.notes}
                onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })}
                placeholder="Log physical inspection findings or reason if rejected/quarantined..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingRelease}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
            >
              {isSubmittingRelease ? 'Recording Decision...' : 'Submit Quality Release Decision'}
            </button>
          </form>
        )}
      </DetailModal>

      {/* ─── MODAL 4: STERILIZATION JOB TIMELINE DRAWER ─────────────────────── */}
      <DetailModal
        isOpen={!!selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        title={selectedJobForDetail ? `Job Traceability Timeline: ${selectedJobForDetail.jobId}` : ''}
        subtitle={selectedJobForDetail ? `${selectedJobForDetail.instrumentName} (${selectedJobForDetail.qrCode})` : ''}
        maxWidth="max-w-lg"
      >
        {selectedJobForDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">
                Visual Sterilization Process Timeline
              </span>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-teal-400 font-bold">1. Submitted</span>
                <span className="text-teal-400 font-bold">2. Queued</span>
                <span className={selectedJobForDetail.status === 'PROCESSING' || selectedJobForDetail.status === 'RELEASE_PENDING' || selectedJobForDetail.status === 'RELEASED' ? 'text-teal-400 font-bold' : 'text-slate-500'}>3. Processing</span>
                <span className={selectedJobForDetail.status === 'RELEASE_PENDING' || selectedJobForDetail.status === 'RELEASED' ? 'text-teal-400 font-bold' : 'text-slate-500'}>4. Release Check</span>
                <span className={selectedJobForDetail.status === 'RELEASED' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>5. Sterile</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-teal-500 h-full w-1/4"></div>
                <div className="bg-teal-500 h-full w-1/4"></div>
                <div className={`h-full w-1/4 ${selectedJobForDetail.status === 'PROCESSING' || selectedJobForDetail.status === 'RELEASE_PENDING' || selectedJobForDetail.status === 'RELEASED' ? 'bg-teal-500' : 'bg-slate-700'}`}></div>
                <div className={`h-full w-1/4 ${selectedJobForDetail.status === 'RELEASED' ? 'bg-emerald-500' : selectedJobForDetail.status === 'REJECTED' || selectedJobForDetail.status === 'QUARANTINED' ? 'bg-rose-500' : 'bg-slate-700'}`}></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-slate-700">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1">Chain of Accountability</h4>
              <p><span className="text-slate-400">Submitted By:</span> <span className="font-bold">{selectedJobForDetail.submittedBy}</span> at {new Date(selectedJobForDetail.submittedAt).toLocaleTimeString()}</p>
              <p><span className="text-slate-400">Received By:</span> <span className="font-bold">{selectedJobForDetail.receivedBy || 'CSSD Specialist'}</span> at {new Date(selectedJobForDetail.receivedAt || selectedJobForDetail.createdAt).toLocaleTimeString()}</p>
              {selectedJobForDetail.releasedBy && (
                <p><span className="text-slate-400">Released By:</span> <span className="font-bold text-emerald-700">{selectedJobForDetail.releasedBy}</span> at {new Date(selectedJobForDetail.releasedAt!).toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* ─── MODAL 5: FULL DATABASE EVENT HISTORY MODAL (Requirement #19 & #20) ─ */}
      <DetailModal
        isOpen={!!itemHistoryModal}
        onClose={() => setItemHistoryModal(null)}
        title={itemHistoryModal?.item ? `Complete Event History: ${itemHistoryModal.item.name}` : 'Item Lifecycle Events'}
        subtitle={itemHistoryModal?.item ? `QR Code: ${itemHistoryModal.item.qrCode}` : ''}
        maxWidth="max-w-lg"
      >
        {itemHistoryModal && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-[11px] font-medium flex items-center space-x-2">
              <History className="h-4 w-4 text-teal-600 flex-shrink-0" />
              <span>Full chronological database audit events for permanent QR identifier {itemHistoryModal.item?.qrCode}.</span>
            </div>

            {itemHistoryModal.events.length === 0 ? (
              <p className="text-center py-6 text-slate-400 font-medium">No recorded events for this item yet.</p>
            ) : (
              <div className="relative border-l-2 border-teal-200 ml-4 space-y-4 pl-4 py-1">
                {itemHistoryModal.events.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative">
                    <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full bg-teal-600 border-2 border-white"></div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">{evt.eventType}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Actor: <span className="font-semibold text-slate-800">{evt.actorName || evt.actorId || 'System'}</span>
                      </p>
                      {evt.fromStatus && evt.toStatus && (
                        <p className="text-[11px] font-mono text-teal-700">
                          Transition: <span className="font-bold">{evt.fromStatus}</span> → <span className="font-bold">{evt.toStatus}</span>
                        </p>
                      )}
                      {evt.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 mt-1">
                          "{evt.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* ─── MODAL 6: RBAC PERMISSION ERROR MODAL ──────────────────────────── */}
      <DetailModal
        isOpen={!!rbacErrorModal}
        onClose={() => setRbacErrorModal(null)}
        title="Workflow Permission Denied"
        subtitle="Role Access Control (RBAC) Enforcement"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-center p-2">
          <div className="p-3.5 bg-rose-100 text-rose-700 rounded-2xl inline-block">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Action Blocked by SmartOT RBAC</h3>
            <p className="text-slate-600 mt-1">{rbacErrorModal}</p>
          </div>
          <button
            onClick={() => setRbacErrorModal(null)}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </DetailModal>

      {/* ─── MODAL 7: QR PASS INSPECTION MODAL ────────────────────────────── */}
      <DetailModal
        isOpen={!!selectedQRItem}
        onClose={() => setSelectedQRItem(null)}
        title={selectedQRItem ? `Sterile Release Badge: ${selectedQRItem.qrCode}` : ''}
        subtitle={selectedQRItem ? selectedQRItem.name : ''}
        maxWidth="max-w-md"
      >
        {selectedQRItem && (
          <div className="flex flex-col items-center">
            <PackQRCode
              packId={selectedQRItem.qrCode}
              packName={selectedQRItem.name}
              batchNumber={selectedQRItem.cycleReference || 'BATCH-2026-08'}
              expiryDate={selectedQRItem.releasedAt ? new Date(new Date(selectedQRItem.releasedAt).getTime() + 14 * 86400000).toLocaleDateString() : new Date(Date.now() + 14 * 86400000).toLocaleDateString()}
              sterilizationMethod={selectedQRItem.sterilizationMethod || 'Steam Autoclave Standard (134°C)'}
              size={210}
              showPrintableLabel={true}
              className="w-full"
            />
          </div>
        )}
      </DetailModal>

      {/* ─── HANDHELD MOBILE STAFF HUB OVERLAY ───────────────────────────── */}
      {showHandheldHub && (
        <HandheldSterileHub
          items={items}
          jobs={jobs}
          onRefreshData={loadCSSDData}
          onClose={() => setShowHandheldHub(false)}
        />
      )}
    </motion.div>
  );
};

export default CSSDPage;
