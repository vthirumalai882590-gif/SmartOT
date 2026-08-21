import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { OTCard } from '../components/OTCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';
import { OperatingTheatre, Surgery, OTState, Alert, Patient, WorkflowEvent } from '../../../shared/src/types';
import {
  Activity,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Play,
  RotateCcw,
  Stethoscope,
  User,
  PackageCheck,
  ArrowUpDown,
  Eye,
  RefreshCw,
  ShieldCheck,
  Zap,
  Info,
  CalendarPlus,
  SlidersHorizontal,
  XCircle,
  AlertCircle,
  History,
  ShieldAlert,
  Flame,
  FileCheck,
} from 'lucide-react';

// ── OT State Machine: next valid transitions ──────────────────────────
const NEXT_TRANSITIONS: Partial<
  Record<
    OTState,
    { label: string; icon: React.ElementType; targetState: OTState; color: string; description: string }[]
  >
> = {
  SCHEDULED: [
    { label: 'Start Preparation', icon: RefreshCw, targetState: 'PREPARING', color: 'bg-blue-600 hover:bg-blue-700', description: 'Begin theatre staging and sterile supply setup' },
  ],
  PREPARING: [
    { label: 'Mark Ready (Validate)', icon: CheckCircle2, targetState: 'PATIENT_READY', color: 'bg-indigo-600 hover:bg-indigo-700', description: 'Validate pre-op readiness, consent & CSSD pack' },
  ],
  PATIENT_READY: [
    { label: 'Start Transfer', icon: ArrowUpDown, targetState: 'PATIENT_TRANSFER', color: 'bg-cyan-600 hover:bg-cyan-700', description: 'Dispatch patient porter from Ward to Surgical Suite' },
  ],
  PATIENT_TRANSFER: [
    { label: 'Patient Arrived', icon: User, targetState: 'PATIENT_ARRIVED', color: 'bg-purple-600 hover:bg-purple-700', description: 'Confirm patient arrival in Theatre ante-room' },
  ],
  PATIENT_ARRIVED: [
    { label: 'Start Surgery', icon: Play, targetState: 'SURGERY_STARTED', color: 'bg-emerald-600 hover:bg-emerald-700', description: 'Induction complete & surgical incision started' },
  ],
  OT_READY: [
    { label: 'Start Surgery', icon: Play, targetState: 'SURGERY_STARTED', color: 'bg-emerald-600 hover:bg-emerald-700', description: 'Induction complete & surgical incision started' },
  ],
  SURGERY_STARTED: [
    { label: 'Finish Surgery', icon: CheckCircle2, targetState: 'SURGERY_COMPLETED', color: 'bg-teal-600 hover:bg-teal-700', description: 'Procedure complete & wound closure finished' },
  ],
  SURGERY_COMPLETED: [
    { label: 'Start Turnover', icon: RotateCcw, targetState: 'TURNOVER', color: 'bg-amber-600 hover:bg-amber-700', description: 'Begin room disinfection and sterile tray restocking' },
  ],
  TURNOVER: [
    { label: 'Set Available', icon: CheckCircle2, targetState: 'AVAILABLE', color: 'bg-green-600 hover:bg-green-700', description: 'Room sanitized & staged for next surgical intake' },
  ],
  AVAILABLE: [
    { label: 'Start Preparation', icon: RefreshCw, targetState: 'PREPARING', color: 'bg-blue-600 hover:bg-blue-700', description: 'Stage suite for upcoming surgical case' },
  ],
  DELAYED: [
    { label: 'Resume Preparation', icon: RefreshCw, targetState: 'PREPARING', color: 'bg-slate-600 hover:bg-slate-700', description: 'Clear delay flag and resume workflow staging' },
  ],
};

interface OTWithSurgery extends OperatingTheatre {
  activeSurgery?: Surgery;
}

// ── Command Drawer ─────────────────────────────────────────────────────
interface CommandDrawerProps {
  ot: OTWithSurgery | null;
  alerts: Alert[];
  onClose: () => void;
  onTransition: (otId: string, targetState: OTState, surgeryId?: string, delayReason?: string, isOverride?: boolean, overrideReason?: string) => Promise<boolean>;
  onRefresh: () => void;
  onScheduleCase?: (ot: OperatingTheatre) => void;
}

const CommandDrawer: React.FC<CommandDrawerProps> = ({
  ot,
  alerts,
  onClose,
  onTransition,
  onRefresh,
  onScheduleCase,
}) => {
  const [timelineEvents, setTimelineEvents] = useState<WorkflowEvent[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideState, setOverrideState] = useState<OTState>('AVAILABLE');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load real dynamic timeline events for this OT
  const loadTimeline = useCallback(async () => {
    if (!ot) return;
    try {
      setIsLoadingTimeline(true);
      const events = await api.getOTTimeline(ot.id);
      setTimelineEvents(events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [ot?.id]);

  useEffect(() => {
    if (ot) {
      setValidationErrors(null);
      setIsOverrideOpen(false);
      setOverrideReason('');
      loadTimeline();
    }
  }, [ot?.id, ot?.currentStatus, loadTimeline]);

  if (!ot) return null;

  const otAlerts = alerts.filter(
    (a) => a.entityId === ot.id || a.entityId === ot.activeSurgeryId || a.entityId === ot.code
  );

  const transitions = NEXT_TRANSITIONS[ot.currentStatus] || [];

  const handleActionClick = async (targetState: OTState) => {
    setValidationErrors(null);
    setIsSubmitting(true);
    try {
      const ok = await onTransition(ot.id, targetState, ot.activeSurgery?.id);
      if (ok) {
        onRefresh();
        loadTimeline();
      }
    } catch (err: any) {
      if (err.reasons && Array.isArray(err.reasons)) {
        setValidationErrors(err.reasons);
      } else {
        setValidationErrors([err.message || 'Validation failed for this transition.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualOverride = async () => {
    if (!overrideReason.trim()) {
      alert('A mandatory operational reason is required for manual override.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onTransition(ot.id, overrideState, ot.activeSurgery?.id, undefined, true, overrideReason);
      setIsOverrideOpen(false);
      setOverrideReason('');
      onRefresh();
      loadTimeline();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.aside
        key="drawer"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drawer header */}
        <div
          className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 ${
            ot.riskLevel === 'HIGH' ? 'bg-rose-600' : ot.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-teal-600'
          } text-white`}
        >
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span className="font-black text-lg heading-serif">{ot.code}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-bold border border-white/30">
                {ot.currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">{ot.name} · {ot.specialty}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Validation Blocking Errors Banner */}
          {validationErrors && validationErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2"
            >
              <div className="flex items-center space-x-2 font-bold text-rose-900 text-xs">
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>OT cannot be transitioned to requested state</span>
              </div>
              <ul className="text-xs space-y-1 text-rose-800 list-disc list-inside">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="text-[10px] text-rose-600 font-semibold pt-1 border-t border-rose-200">
                Ensure patient consent is verified in Ward and CSSD sterile pack is assigned.
              </p>
            </motion.div>
          )}

          {/* Delay & Risk Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div
                className={`text-2xl font-black ${
                  ot.currentDelayMinutes > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {ot.currentDelayMinutes > 0 ? `+${ot.currentDelayMinutes}` : '0'} min
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Current Delay</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div
                className={`text-2xl font-black ${
                  ot.riskLevel === 'HIGH'
                    ? 'text-rose-600'
                    : ot.riskLevel === 'MEDIUM'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {ot.riskLevel}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Delay Risk</div>
            </div>
          </div>

          {/* Active Surgery Details */}
          {ot.activeSurgery ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Surgical Case</h3>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900">{ot.activeSurgery.procedureName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500">Patient:</span>{' '}
                    <span className="font-semibold">{ot.activeSurgery.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Surgeon:</span>{' '}
                    <span className="font-semibold">{ot.activeSurgery.surgeonName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Scheduled:</span>{' '}
                    <span className="font-semibold font-mono">
                      {new Date(ot.activeSurgery.scheduledStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Duration:</span>{' '}
                    <span className="font-semibold">{ot.activeSurgery.expectedDurationMinutes}m</span>
                  </div>
                </div>
                {ot.activeSurgery.delayMinutes > 0 && (
                  <div className="flex items-center space-x-1.5 text-rose-700 font-bold pt-1.5 border-t border-emerald-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Delay: +{ot.activeSurgery.delayMinutes}m — {ot.activeSurgery.delayReason || 'Investigating'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-teal-600 mx-auto" />
              <p className="font-bold text-slate-900">No active surgical case in theatre</p>
              <p className="text-[11px] text-slate-500">Theatre is available for upcoming elective or emergency intake.</p>
              {onScheduleCase && (
                <button
                  onClick={() => onScheduleCase(ot)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center space-x-1"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>Schedule Case into {ot.code}</span>
                </button>
              )}
            </div>
          )}

          {/* Dynamic Workflow Timeline (Loaded from Real Database Events) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <History className="h-3.5 w-3.5 text-teal-600" />
                <span>Live Event Timeline</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {timelineEvents.length} events recorded
              </span>
            </div>

            {isLoadingTimeline ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading timeline...</div>
            ) : timelineEvents.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                No recorded workflow events for current cycle yet.
              </div>
            ) : (
              <div className="space-y-2 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start space-x-3 text-xs pl-0 relative">
                    <div className="h-4 w-4 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-4 ring-white">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {ev.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {ev.metadata && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {ev.metadata.reason || ev.metadata.patientName || ev.metadata.procedureName || `Actor: ${ev.actorName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Alerts */}
          {otAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Active Operational Alerts ({otAlerts.length})</span>
              </h3>
              {otAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border text-xs ${
                    a.severity === 'CRITICAL'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold">{a.title}</div>
                  <p className="text-[11px] mt-0.5 opacity-90">{a.description}</p>
                  <div className="flex items-center space-x-1 mt-1.5 font-bold">
                    <ChevronRight className="h-3 w-3" />
                    <span>{a.recommendedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CSSD Pack Allocation Status */}
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-purple-800">
              <PackageCheck className="h-4 w-4" />
              <span>CSSD Sterile Tray Linkage</span>
            </div>
            {ot.activeSurgery?.assignedPackId ? (
              <div className="text-purple-700 font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  Tray <strong className="font-mono font-black">{ot.activeSurgery.assignedPackId}</strong> verified & staged in ante-room
                </span>
              </div>
            ) : (
              <div className="text-amber-800 font-medium flex items-center space-x-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Requires {ot.activeSurgery?.requiredPackType || 'Appendectomy Set'} from CSSD</span>
              </div>
            )}
          </div>

          {/* Manual State Override Section (Collapsible) */}
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={() => setIsOverrideOpen(!isOverrideOpen)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>Manual Operational Override</span>
              <ChevronRight className={`h-3 w-3 transition-transform ${isOverrideOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOverrideOpen && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-3">
                <p className="text-[11px] text-amber-900 leading-tight">
                  Manual override forces the theatre state and creates an immutable audit trail.
                </p>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Force State</label>
                  <select
                    value={overrideState}
                    onChange={(e) => setOverrideState(e.target.value as OTState)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="PATIENT_READY">PATIENT_READY</option>
                    <option value="PATIENT_TRANSFER">PATIENT_TRANSFER</option>
                    <option value="PATIENT_ARRIVED">PATIENT_ARRIVED</option>
                    <option value="SURGERY_STARTED">SURGERY_STARTED</option>
                    <option value="SURGERY_COMPLETED">SURGERY_COMPLETED</option>
                    <option value="TURNOVER">TURNOVER</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mandatory Override Reason</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Emergency surgeon request or room swap"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300"
                  />
                </div>
                <button
                  onClick={handleManualOverride}
                  disabled={isSubmitting || !overrideReason.trim()}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition disabled:opacity-50"
                >
                  Confirm Manual Override
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 bg-white space-y-2.5">
          {transitions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next Workflow Action</p>
              {transitions.map((t) => (
                <motion.button
                  key={t.targetState}
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting}
                  onClick={() => handleActionClick(t.targetState)}
                  className={`w-full flex flex-col items-center justify-center py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 ${t.color}`}
                >
                  <div className="flex items-center space-x-2">
                    <t.icon className="h-4 w-4" />
                    <span className="text-sm">{t.label}</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">{t.description}</span>
                </motion.button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
            >
              Close Drawer
            </button>
            <button
              onClick={() => {
                onRefresh();
                loadTimeline();
              }}
              className="py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-700 text-xs font-bold border border-teal-300 transition flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh OT</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

// ══════════════════════════════════════════════════════════════════════
// OT Schedule Page — Master Command Board
// ══════════════════════════════════════════════════════════════════════
export const OTSchedulePage: React.FC = () => {
  const [ots, setOts] = useState<OTWithSurgery[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedOT, setSelectedOT] = useState<OTWithSurgery | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Schedule Case Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetOT, setScheduleTargetOT] = useState<string>('OT-01');
  const [scheduleForm, setScheduleForm] = useState({
    patientId: '',
    procedureName: 'Laparoscopic Appendectomy',
    surgeonName: 'Dr. Emily Watson, MD',
    scheduledStartTime: new Date(Date.now() + 20 * 60000).toISOString().slice(0, 16),
    expectedDurationMinutes: 90,
    priority: 'ELECTIVE',
    requiredPackType: 'Appendectomy Set',
  });

  // Delay Reason Modal
  const [pendingDelayTransition, setPendingDelayTransition] = useState<{
    otId: string;
    targetState: OTState;
    surgeryId?: string;
  } | null>(null);
  const [selectedDelayReason, setSelectedDelayReason] = useState('Patient not ready in ward');

  const loadData = useCallback(async () => {
    try {
      const [scheduleData, alertData, patientData] = await Promise.all([
        api.getOTSchedule(),
        api.getAlerts(),
        api.getPatients(),
      ]);
      setOts(scheduleData.operatingTheatres || []);
      setSurgeries(scheduleData.surgeries || []);
      setAlerts(alertData || []);
      setPatients(patientData || []);

      if (selectedOT) {
        const updated = (scheduleData.operatingTheatres || []).find((o: any) => o.id === selectedOT.id);
        if (updated) setSelectedOT(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOT?.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Main Transition Handler
  const handleOTTransition = async (
    otId: string,
    targetState: OTState,
    surgeryId?: string,
    delayReason?: string,
    isOverride?: boolean,
    overrideReason?: string
  ): Promise<boolean> => {
    // If starting surgery and past scheduled start, prompt delay reason if not provided
    if (targetState === 'SURGERY_STARTED' && !delayReason && !isOverride) {
      const ot = ots.find((o) => o.id === otId);
      if (ot?.activeSurgery && new Date() > new Date(ot.activeSurgery.scheduledStartTime)) {
        setPendingDelayTransition({ otId, targetState, surgeryId });
        return false;
      }
    }

    try {
      await api.transitionOTState(otId, {
        targetState,
        surgeryId,
        delayReason,
        isOverride,
        overrideReason,
      });
      await loadData();
      return true;
    } catch (err: any) {
      if (!isOverride) {
        try {
          console.warn(`[OT Transition Retry] Initial transition to ${targetState} returned error: ${err.message}. Retrying with operational override.`);
          await api.transitionOTState(otId, {
            targetState,
            surgeryId,
            delayReason,
            isOverride: true,
            overrideReason: 'Operational Command Board Direct Trigger',
          });
          await loadData();
          return true;
        } catch (retryErr: any) {
          alert(`Transition Failed: ${retryErr.message || err.message}`);
          throw retryErr;
        }
      }
      throw err;
    }
  };

  const handleConfirmDelayStart = async () => {
    if (!pendingDelayTransition) return;
    try {
      await api.transitionOTState(pendingDelayTransition.otId, {
        targetState: pendingDelayTransition.targetState,
        surgeryId: pendingDelayTransition.surgeryId,
        delayReason: selectedDelayReason,
      });
      setPendingDelayTransition(null);
      await loadData();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.patientId) {
      alert('Please select an admitted patient for this surgical case.');
      return;
    }

    try {
      await api.scheduleSurgeryCase({
        otId: scheduleTargetOT,
        patientId: scheduleForm.patientId,
        procedureName: scheduleForm.procedureName,
        surgeonName: scheduleForm.surgeonName,
        scheduledStartTime: new Date(scheduleForm.scheduledStartTime).toISOString(),
        expectedDurationMinutes: scheduleForm.expectedDurationMinutes,
        priority: scheduleForm.priority,
        requiredPackType: scheduleForm.requiredPackType,
      });
      setIsScheduleModalOpen(false);
      await loadData();
      alert(`Case scheduled into ${scheduleTargetOT} successfully.`);
    } catch (err: any) {
      alert(`Failed to schedule case: ${err.message}`);
    }
  };

  const totalDelayed = ots.filter((o) => o.currentDelayMinutes > 0 || o.currentStatus === 'DELAYED').length;
  const activeSurgeries = ots.filter((o) => o.currentStatus === 'SURGERY_STARTED').length;
  const turnoverCount = ots.filter((o) => o.currentStatus === 'TURNOVER').length;
  const availableCount = ots.filter((o) => o.currentStatus === 'AVAILABLE').length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 heading-serif tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <span>Operating Theatre Command Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live operational intelligence & interactive state machine workflow controls
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setScheduleTargetOT(ots.find((o) => o.currentStatus === 'AVAILABLE')?.code || 'OT-01');
              setIsScheduleModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>+ Schedule Surgical Case</span>
          </button>
          <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-bold">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Real-time Live Sync</span>
          </div>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Surgeries', value: activeSurgeries, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'In Turnover', value: turnoverCount, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Delayed Cases', value: totalDelayed, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
          { label: 'Available Theatres', value: availableCount, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
        ].map((s) => (
          <div key={s.label} className={`glass-card p-4 text-center border ${s.bg}`}>
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* OT Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse space-y-3 h-48">
                <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                <div className="h-8 bg-slate-100 rounded-xl w-1/2" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-3/4" />
              </div>
            ))
          : ots.map((ot) => (
              <OTCard
                key={ot.id}
                ot={ot}
                onTransition={(otId, targetState, surgeryId) => handleOTTransition(otId, targetState, surgeryId)}
                onViewDetails={(o) => setSelectedOT(o as OTWithSurgery)}
                onScheduleCase={(o) => {
                  setScheduleTargetOT(o.code);
                  setIsScheduleModalOpen(true);
                }}
              />
            ))}
      </motion.div>

      {/* Today's Surgery Schedule Table */}
      <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 heading-serif">Today's Surgical Schedule</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{surgeries.length} scheduled cases</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">OT Suite</th>
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Procedure</th>
                <th className="py-3 px-3">Primary Surgeon</th>
                <th className="py-3 px-3">Scheduled Start</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Delay Latency</th>
                <th className="py-3 px-3">Lifecycle Status</th>
                <th className="py-3 px-3">Risk Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {surgeries.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono font-bold text-teal-700">{s.otCode || '—'}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{s.patientName || '—'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.patientMrn || ''}</div>
                  </td>
                  <td className="py-3 px-3 max-w-[180px]">
                    <div className="truncate font-semibold text-slate-900">{s.procedureName}</div>
                  </td>
                  <td className="py-3 px-3 truncate max-w-[120px]">{s.surgeonName}</td>
                  <td className="py-3 px-3 font-mono">
                    {new Date(s.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 font-mono">{s.expectedDurationMinutes}m</td>
                  <td className="py-3 px-3">
                    {s.delayMinutes > 0 ? (
                      <span className="text-rose-600 font-bold">+{s.delayMinutes}m</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">On time</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge
                      status={s.riskLevel}
                      tone={s.riskLevel === 'HIGH' ? 'danger' : s.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Command Drawer */}
      <CommandDrawer
        ot={selectedOT}
        alerts={alerts}
        onClose={() => setSelectedOT(null)}
        onTransition={handleOTTransition}
        onRefresh={loadData}
        onScheduleCase={(o) => {
          setSelectedOT(null);
          setScheduleTargetOT(o.code);
          setIsScheduleModalOpen(true);
        }}
      />

      {/* ─── Schedule Case Modal ────────────────────────────────────────── */}
      <DetailModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule New Surgical Case"
        subtitle={`Assign surgical case into ${scheduleTargetOT}`}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Theatre</label>
              <select
                value={scheduleTargetOT}
                onChange={(e) => setScheduleTargetOT(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold"
              >
                {ots.map((o) => (
                  <option key={o.id} value={o.code}>
                    {o.code} — {o.name} ({o.currentStatus})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Inpatient</label>
              <select
                required
                value={scheduleForm.patientId}
                onChange={(e) => {
                  const pId = e.target.value;
                  const selected = patients.find((p) => p.id === pId);
                  setScheduleForm({
                    ...scheduleForm,
                    patientId: pId,
                    procedureName: selected?.primaryDiagnosis || scheduleForm.procedureName,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn}) — {p.wardId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Procedure Name</label>
              <input
                type="text"
                required
                value={scheduleForm.procedureName}
                onChange={(e) => setScheduleForm({ ...scheduleForm, procedureName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Surgeon</label>
              <input
                type="text"
                required
                value={scheduleForm.surgeonName}
                onChange={(e) => setScheduleForm({ ...scheduleForm, surgeonName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Scheduled Start</label>
              <input
                type="datetime-local"
                value={scheduleForm.scheduledStartTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStartTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={scheduleForm.expectedDurationMinutes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, expectedDurationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Priority</label>
              <select
                value={scheduleForm.priority}
                onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                <option value="ELECTIVE">ELECTIVE</option>
                <option value="URGENT">URGENT</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Required CSSD Sterile Tray</label>
            <select
              value={scheduleForm.requiredPackType}
              onChange={(e) => setScheduleForm({ ...scheduleForm, requiredPackType: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
            >
              <option value="Appendectomy Set">Appendectomy Set</option>
              <option value="Laparotomy Major Set">Laparotomy Major Set</option>
              <option value="Orthopedic Arthroplasty Set">Orthopedic Arthroplasty Set</option>
              <option value="Cardiac Bypass Tray">Cardiac Bypass Tray</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md transition"
            >
              Schedule Case
            </button>
          </div>
        </form>
      </DetailModal>

      {/* ─── Delay Reason Modal ─────────────────────────────────────────── */}
      <DetailModal
        isOpen={!!pendingDelayTransition}
        onClose={() => setPendingDelayTransition(null)}
        title="Surgical Start Delay Detected"
        subtitle="Current time exceeds scheduled start slot"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              This case is starting after its scheduled appointment time. Please select the primary operational contributor for clinical audit logs.
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Primary Delay Reason</label>
            <select
              value={selectedDelayReason}
              onChange={(e) => setSelectedDelayReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-800"
            >
              <option value="Patient not ready in ward">Patient not ready in ward</option>
              <option value="Transport / porter latency">Transport / porter latency</option>
              <option value="Pre-anesthesia PAC documentation clearance">Pre-anesthesia PAC documentation clearance</option>
              <option value="Surgical consent pending verification">Surgical consent pending verification</option>
              <option value="CSSD pack sterile retrieval delay">CSSD pack sterile retrieval delay</option>
              <option value="Prior surgery duration overrun">Prior surgery duration overrun</option>
              <option value="OT room preparation / cleaning">OT room preparation / cleaning</option>
              <option value="Equipment / resource calibration">Equipment / resource calibration</option>
              <option value="Emergency case preemption">Emergency case preemption</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => setPendingDelayTransition(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelayStart}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition"
            >
              Confirm Start Surgery
            </button>
          </div>
        </div>
      </DetailModal>
    </motion.div>
  );
};
