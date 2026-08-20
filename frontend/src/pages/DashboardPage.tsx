import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { OTCard } from '../components/OTCard';
import {
  Activity,
  CalendarClock,
  Users,
  AlertTriangle,
  PackageCheck,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Star,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowUpDown,
  Stethoscope,
  Building2,
  FlaskConical,
  Scissors,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { OTState } from '../../../shared/src/types';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';
import { StatusBadge } from '../components/ui/StatusBadge';

interface DashboardProps {
  onOpenAIConsultant?: () => void;
  onOpenScenarioRunner?: () => void;
}

// ─── Hospital Flow Stage type ───────────────────────────────────────
interface FlowStage {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  statusColor: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
}

// ─── Severity color helpers ───────────────────────────────────────────
function alertBg(severity: string) {
  if (severity === 'CRITICAL') return 'bg-rose-50 border-rose-300 text-rose-900';
  if (severity === 'WARNING') return 'bg-amber-50 border-amber-300 text-amber-900';
  return 'bg-teal-50 border-teal-300 teal-900';
}

function alertIcon(severity: string) {
  if (severity === 'CRITICAL') return <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />;
  if (severity === 'WARNING') return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  return <AlertCircle className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onOpenAIConsultant, onOpenScenarioRunner }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getCommandCenter();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOTTransition = async (otId: string, targetState: OTState, surgeryId?: string) => {
    try {
      await api.transitionOTState(otId, { targetState, surgeryId });
      loadData();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 animate-fade-in-up">
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 shadow-sm">
          <Activity className="h-10 w-10 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 heading-serif">Connecting to SmartOT Command Event Stream</h3>
          <p className="text-xs text-slate-500">Synchronizing live telemetry across Admissions, Wards, CSSD, and Surgical Suites...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const alerts = data?.alerts || [];
  const ots = data?.operatingTheatres || [];
  const nextBestActions = data?.nextBestActions || [];
  const bottlenecks = data?.bottlenecks || [];
  const recentEvents = data?.recentEvents || [];

  // ── Top 3 attention items for Focus Mode ──────────────────────────────
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'CRITICAL');
  const topAttentionItems = [
    ...criticalAlerts.slice(0, 3),
    ...alerts.filter((a: any) => a.severity === 'WARNING').slice(0, Math.max(0, 3 - criticalAlerts.length)),
  ].slice(0, 3);

  // ── Hospital Flow Visualization data ─────────────────────────────────
  const flowStages: FlowStage[] = [
    {
      id: 'admissions',
      label: 'Admissions',
      sublabel: 'Registered today',
      icon: Building2,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      count: data?.kpis?.readyPatients ? data.kpis.readyPatients + 3 : 11,
      statusColor: 'blue',
    },
    {
      id: 'wards',
      label: 'Wards',
      sublabel: 'Pre-op readiness',
      icon: Users,
      color: 'text-violet-700',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
      count: kpis?.readyPatients ?? 8,
      statusColor: 'purple',
    },
    {
      id: 'cssd',
      label: 'CSSD',
      sublabel: 'Packs available',
      icon: FlaskConical,
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      count: kpis?.cssdAvailability ?? 94,
      statusColor: 'blue',
    },
    {
      id: 'transfer',
      label: 'Transfer',
      sublabel: 'In transit now',
      icon: ArrowUpDown,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      count: ots.filter((o: any) => o.currentStatus === 'PATIENT_TRANSFER').length,
      statusColor: 'amber',
    },
    {
      id: 'ot',
      label: 'Operating Theatre',
      sublabel: 'Active surgeries',
      icon: Stethoscope,
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      count: kpis?.activeSurgeries ?? 1,
      statusColor: 'green',
    },
    {
      id: 'turnover',
      label: 'Turnover',
      sublabel: 'OTs being cleaned',
      icon: RefreshCw,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      count: ots.filter((o: any) => o.currentStatus === 'TURNOVER').length,
      statusColor: 'amber',
    },
    {
      id: 'available',
      label: 'Available',
      sublabel: 'OTs ready for next',
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      count: ots.filter((o: any) => o.currentStatus === 'AVAILABLE').length,
      statusColor: 'green',
    },
  ];

  const countBgClass = (s: FlowStage) => {
    const map: Record<string, string> = {
      green: 'bg-emerald-600',
      amber: 'bg-amber-500',
      red: 'bg-rose-600',
      blue: 'bg-indigo-600',
      purple: 'bg-violet-600',
      slate: 'bg-slate-500',
    };
    return map[s.statusColor] || 'bg-slate-500';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* ── Top bar: title + Focus Mode toggle ─────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 heading-serif tracking-tight">
            SmartOT <span className="text-teal-600">Command Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Live hospital operations intelligence · Auto-refreshes every 5 s</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenScenarioRunner && (
            <button
              onClick={onOpenScenarioRunner}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold flex items-center space-x-1 px-3.5 py-2 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 shadow-sm transition"
            >
              <span>Run P-1024 Demo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-full border shadow-sm transition-all ${
              focusMode
                ? 'bg-teal-600 text-white border-teal-600 shadow-teal-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-700'
            }`}
          >
            {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── FOCUS MODE — Show only top 3 attention items ────────────── */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            key="focus-panel"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-5 border-2 border-teal-400 space-y-4"
          >
            <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3">
              <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <h2 className="text-sm font-black text-slate-900 heading-serif uppercase tracking-wider">
                Focus Mode — {topAttentionItems.length} Items Need Attention Right Now
              </h2>
            </div>
            {topAttentionItems.length === 0 ? (
              <div className="flex items-center space-x-2 text-emerald-700 text-sm font-semibold py-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>All operations are within normal parameters. No immediate actions required.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {topAttentionItems.map((a: any, i: number) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`p-4 rounded-xl border text-sm space-y-2 ${alertBg(a.severity)}`}
                  >
                    <div className="flex items-start space-x-2">
                      {alertIcon(a.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm">{a.title}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/60 border border-current shrink-0">
                            {a.severity}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{a.description}</p>
                        <div className="mt-2 flex items-center space-x-1.5 text-xs font-bold">
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span>ACTION: {a.recommendedAction}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Hero Cards ───────────────────────────────────────────── */}
      {!focusMode && (
        <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <motion.div variants={itemVariants}>
            <KpiCard
              title="OT Utilization"
              value={kpis?.otUtilization || 82}
              subtitle="4 Active Theatres"
              icon={Activity}
              statusColor="teal"
              showRing={true}
              maxRingValue={100}
              progressValue={kpis?.otUtilization || 82}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Active Surgeries"
              value={kpis?.activeSurgeries || 1}
              subtitle="Incision in progress"
              icon={CalendarClock}
              statusColor="emerald"
              progressValue={((kpis?.activeSurgeries || 1) / 4) * 100}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Ready Patients"
              value={kpis?.readyPatients || 8}
              subtitle="6/6 Checklist complete"
              icon={Users}
              statusColor="blue"
              progressValue={80}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Delayed Cases"
              value={kpis?.delayedCases || 2}
              subtitle="Over tolerance buffer"
              icon={Clock}
              statusColor="rose"
              progressValue={40}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="High-Risk Cases"
              value={kpis?.highRiskCases || 1}
              subtitle="Cascading delay risk"
              icon={AlertTriangle}
              statusColor="amber"
              progressValue={25}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="CSSD Availability"
              value={`${kpis?.cssdAvailability || 94}%`}
              subtitle="Sterile packs staged"
              icon={PackageCheck}
              statusColor="purple"
              progressValue={kpis?.cssdAvailability || 94}
            />
          </motion.div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          HOSPITAL FLOW VISUALIZATION — Hero Feature
          Live counts at each stage of the surgical workflow pipeline
          ══════════════════════════════════════════════════════════════ */}
      {!focusMode && (
        <motion.div variants={itemVariants} className="glass-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Live Hospital Flow
              </span>
              <h2 className="text-lg font-bold text-slate-900 heading-serif mt-2">
                Surgical Workflow Pipeline
              </h2>
              <p className="text-xs text-slate-500">Real-time patient and resource counts at each stage of the hospital workflow</p>
            </div>
            <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1.5 rounded-full border border-teal-200">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Flow stages — horizontal scroll on mobile, responsive flex on desktop */}
          <div className="overflow-x-auto -mx-1 pb-2">
            <div className="flex items-center justify-between min-w-[840px] w-full px-1 py-1">
              {flowStages.map((stage, idx) => (
                <React.Fragment key={stage.id}>
                  {/* Stage card */}
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className={`flex-1 min-w-[108px] max-w-[136px] h-[168px] p-3 rounded-2xl border ${stage.bgColor} ${stage.borderColor} shadow-sm cursor-pointer transition-all flex flex-col items-center justify-between select-none`}
                  >
                    <div className={`p-2 rounded-xl ${stage.bgColor} border ${stage.borderColor} shrink-0`}>
                      <stage.icon className={`h-4.5 w-4.5 ${stage.color}`} />
                    </div>
                    <div className={`text-xl font-black tracking-tight ${stage.color} shrink-0`}>
                      {stage.count}{stage.id === 'cssd' ? '%' : ''}
                    </div>
                    <div className="w-full text-center space-y-0.5">
                      <div className={`text-[11px] font-bold leading-tight ${stage.color} line-clamp-1`}>
                        {stage.label}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight line-clamp-1">
                        {stage.sublabel}
                      </div>
                    </div>
                    {/* Live indicator dot */}
                    <div className={`h-1.5 w-1.5 rounded-full ${countBgClass(stage)} shrink-0`} />
                  </motion.div>

                  {/* Arrow between stages */}
                  {idx < flowStages.length - 1 && (
                    <div className="flex items-center justify-center shrink-0 px-0.5 text-slate-300">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80">
            {[
              { label: 'Patients in System', value: (kpis?.readyPatients || 8) + (kpis?.activeSurgeries || 1) + 5, color: 'text-indigo-700', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
              { label: 'Active Surgeries', value: kpis?.activeSurgeries || 1, color: 'text-teal-700', bg: 'bg-teal-50/50', border: 'border-teal-100' },
              { label: 'OTs in Turnover', value: ots.filter((o: any) => o.currentStatus === 'TURNOVER').length, color: 'text-orange-700', bg: 'bg-orange-50/50', border: 'border-orange-100' },
              { label: 'OTs Available', value: ots.filter((o: any) => o.currentStatus === 'AVAILABLE').length, color: 'text-emerald-700', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-center py-2.5 px-3 rounded-xl ${item.bg} border ${item.border} shadow-xs flex flex-col items-center justify-center`}
              >
                <div className={`text-2xl font-black tracking-tight ${item.color}`}>{item.value}</div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Needs Attention + Quick Actions ──────────────────────────── */}
      {!focusMode && (
        <motion.div variants={itemVariants} className="glass-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 heading-serif">Needs Attention</h2>
            </div>
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              {alerts.filter((a: any) => a.status === 'OPEN').length} Open
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="flex items-center space-x-2 text-emerald-700 text-sm font-semibold py-4 justify-center">
              <CheckCircle2 className="h-5 w-5" />
              <span>All operations nominal. No immediate attention required.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.slice(0, 4).map((a: any, i: number) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all hover:scale-[1.01] hover:shadow-md ${alertBg(a.severity)}`}
                >
                  {/* SIGNAL */}
                  <div className="flex items-center justify-between font-black text-sm">
                    <div className="flex items-center space-x-1.5">
                      {alertIcon(a.severity)}
                      <span>{a.title}</span>
                    </div>
                    <StatusBadge status={a.severity} size="sm" />
                  </div>
                  {/* CONTEXT */}
                  <p className="text-[11px] opacity-90 leading-relaxed font-medium">{a.description}</p>
                  {/* EVIDENCE → ACTION */}
                  <div className="flex items-center justify-between pt-1 border-t border-current/10">
                    <div className="flex items-center space-x-1 text-[11px] font-bold">
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span>ACTION: {a.recommendedAction}</span>
                    </div>
                    <StatusBadge status={a.responsibleRole} size="sm" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Quick-Access Action Cards (AI Consultant, Readiness, CSSD) ─ */}
      {!focusMode && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div
            whileHover={{ scale: 1.02, boxShadow: '0px 16px 32px rgba(37, 99, 235, 0.25)' }}
            whileTap={{ scale: 0.99 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer"
            onClick={onOpenAIConsultant}
          >
            <div className="kpi-icon-ring bg-white/20 mb-4 shadow-sm">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-1 heading-serif">AI Operations Consultant</h3>
            <p className="text-blue-100 text-sm">Evidence-based root-cause analysis and advisory</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, boxShadow: '0px 16px 32px rgba(5, 150, 105, 0.25)' }}
            whileTap={{ scale: 0.99 }}
            className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all"
          >
            <div className="kpi-icon-ring bg-white/20 mb-4 shadow-sm">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-1 heading-serif">Inpatient Readiness</h3>
            <p className="text-emerald-100 text-sm">
              {kpis?.readyPatients || 8} patients verified for OT transfer today
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, boxShadow: '0px 16px 32px rgba(126, 34, 206, 0.25)' }}
            whileTap={{ scale: 0.99 }}
            className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all"
          >
            <div className="kpi-icon-ring bg-white/20 mb-4 shadow-sm">
              <Star className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-1 heading-serif">CSSD Availability</h3>
            <p className="text-purple-100 text-sm">
              {kpis?.cssdAvailability || 94}% sterile pack availability across all theatres
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ── Live Operating Theatres ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="glass-card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 heading-serif flex items-center space-x-2.5">
              <span>Live Operating Theatres</span>
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono border border-teal-200 shadow-sm">
                Real-Time
              </span>
            </h2>
            <p className="text-xs text-slate-500">State machine progression, room turnovers, and active procedural stages</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ots.map((ot: any) => (
            <OTCard
              key={ot.id}
              ot={ot}
              onTransition={handleOTTransition}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Two-column: Alerts + Next-Best-Actions ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Operational Alerts */}
        <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 heading-serif">Active Operational Alerts</h3>
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">{alerts.length} Open</span>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 3).map((a: any) => (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all hover:scale-[1.01] hover:shadow-md ${alertBg(a.severity)}`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{a.title}</span>
                  <StatusBadge status={a.responsibleRole} size="sm" />
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed font-medium">{a.description}</p>
                <p className="text-[11px] font-bold text-slate-900 pt-0.5">Action: {a.recommendedAction}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next-Best-Action Intelligence Engine */}
        <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 heading-serif">Next-Best Operational Actions</h3>
            </div>
            <span className="text-xs text-teal-700 font-bold">Priority Ranked</span>
          </div>

          <div className="space-y-2.5">
            {nextBestActions.slice(0, 3).map((nba: any) => (
              <div
                key={nba.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:scale-[1.01] hover:shadow-md transition-all text-xs space-y-1 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge
                    status={`${nba.priority} PRIORITY`}
                    tone={nba.priority === 'HIGH' ? 'danger' : 'warning'}
                  />
                  <span className="text-[10px] text-slate-500 font-mono font-semibold">Impact: {nba.impactScore}/100</span>
                </div>
                <p className="font-bold text-slate-900">{nba.action}</p>
                <p className="text-[11px] text-slate-600 leading-snug">{nba.rationale}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Two-column: Bottlenecks + Event Stream ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Root-Cause Bottlenecks */}
        <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900 heading-serif">Top Delay Bottlenecks (Today)</h3>
            </div>
            <span className="text-xs text-slate-500">Aggregated Events</span>
          </div>

          <div className="space-y-3">
            {bottlenecks.map((b: any) => (
              <div key={b.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800">{b.name}</span>
                  <span className="text-teal-700 font-mono font-bold">{b.percentage}% ({b.totalDelayMinutes}m)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${b.percentage}%`,
                      background: 'linear-gradient(to right, hsl(160, 60%, 45%), hsl(173, 80%, 40%))',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{b.caseCount} cases affected</span>
                  <span className={b.trend === 'UP' ? 'text-rose-500 font-bold' : b.trend === 'DOWN' ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {b.trend === 'UP' ? '↑ Worsening' : b.trend === 'DOWN' ? '↓ Improving' : '→ Stable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Correlated Workflow Event Stream */}
        <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 heading-serif">Recent Workflow Events</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Immutable Log</span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-52 overflow-y-auto pr-1">
            {recentEvents.slice(0, 8).map((e: any) => (
              <div
                key={e.id}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:scale-[1.01] transition-all flex items-center justify-between shadow-sm"
              >
                <div className="truncate mr-2">
                  <span className="text-teal-700 font-bold">[{e.department}]</span>{' '}
                  <span className="text-slate-800 font-medium">{e.eventType}</span>{' '}
                  <span className="text-slate-400 text-[10px]">({e.entityId})</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-semibold">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
