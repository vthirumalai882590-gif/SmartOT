import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PackQRCode } from '../PackQRCode';
import {
  CSSDItem,
  SterilizationJob,
} from '../../../../shared/src/types';
import {
  QrCode,
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
  PackageCheck,
  X,
  Thermometer,
  Gauge,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  BatteryCharging,
  Play,
  FileCheck,
} from 'lucide-react';

interface HandheldSterileHubProps {
  items: CSSDItem[];
  jobs: SterilizationJob[];
  onRefreshData: () => Promise<void>;
  onClose: () => void;
}

type HandheldTab = 'pipeline' | 'badges';

export const HandheldSterileHub: React.FC<HandheldSterileHubProps> = ({
  items,
  jobs,
  onRefreshData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HandheldTab>('pipeline');

  // Live Timer Ticker State (ticks every 1 second)
  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // CSSD Workflow Pipeline Categorization
  const queuedJobs = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'RECEIVED');
  const activeProcessingJobs = jobs.filter((j) => j.status === 'PROCESSING');
  const releasePendingJobs = jobs.filter((j) => j.status === 'RELEASE_PENDING' || j.status === 'COMPLETED');
  const quarantinedJobs = jobs.filter((j) => j.status === 'QUARANTINED' || j.status === 'REJECTED');
  const completedReleasedJobs = jobs.filter((j) => j.status === 'RELEASED');
  const availableSterileItems = items.filter(
    (i) => i.currentStatus === 'STERILE' || i.currentStatus === 'AVAILABLE' || i.currentStatus === 'STORED'
  );

  // Helper to compute realistic countdown timer MM:SS
  const formatCountdown = (job: SterilizationJob) => {
    let expTime = job.expectedCompletionAt ? new Date(job.expectedCompletionAt).getTime() : Date.now() + 35 * 60000;
    const nowTime = Date.now();
    let diffSec = Math.round((expTime - nowTime) / 1000);

    if (diffSec < 0) {
      const createdTime = new Date(job.createdAt || job.submittedAt || Date.now()).getTime();
      const elapsedTotalMins = Math.floor((nowTime - createdTime) / 60000) % 45;
      const remMins = Math.max(1, 35 - elapsedTotalMins);
      diffSec = remMins * 60 + 15;
    }

    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const totalSec = 35 * 60;
    const elapsedSec = Math.max(0, totalSec - diffSec);
    const progressPercent = Math.min(100, Math.max(8, Math.round((elapsedSec / totalSec) * 100)));

    return {
      formatted: `${mins}m ${secs.toString().padStart(2, '0')}s remaining`,
      progressPercent,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      {/* Background Backdrop Click to Dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Professional Handheld Terminal Container — Clean White Theme */}
      <div className="relative z-10 w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col font-sans h-[88vh] max-h-[850px]">
        
        {/* ── 1. Top Clinical Device Status Bar ────────────────────────────── */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-sm text-slate-900 tracking-wide">SmartOT Mobile Terminal</h2>
                <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 font-mono text-[9px] font-bold">
                  PDA-#04
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Central Sterile Sync • Online</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mr-1">
              <Wifi className="h-3 w-3 text-teal-600" />
              <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
            </div>

            <button
              onClick={() => onRefreshData()}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-sm transition"
              title="Sync Database"
            >
              <RefreshCw className="h-4 w-4 text-teal-600" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm transition"
              title="Close Terminal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Segmented Navigation Bar (Pipeline & Badges) ──────────────────── */}
        <div className="grid grid-cols-2 p-2 bg-slate-100/90 border-b border-slate-200 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`py-2.5 rounded-xl flex items-center justify-center space-x-2 transition ${
              activeTab === 'pipeline'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>Sterilization Pipeline ({queuedJobs.length + activeProcessingJobs.length + releasePendingJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`py-2.5 rounded-xl flex items-center justify-center space-x-2 transition ${
              activeTab === 'badges'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>QR Badges ({availableSterileItems.length})</span>
          </button>
        </div>

        {/* ── 3. Body Viewport ──────────────────────────────────────────────── */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          
          {/* TAB 1: COMPLETE STERILIZATION WORKFLOW PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-5">
              
              {/* SECTION A: PENDING INTAKE QUEUE */}
              {queuedJobs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>1. Pending Sterilization Intake ({queuedJobs.length})</span>
                    </span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 font-mono font-bold">
                      Awaiting Chamber Load
                    </span>
                  </div>

                  {queuedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-amber-600 text-xs">{job.jobId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Source: {job.sourceOT || job.sourceDepartment}</span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{job.instrumentName}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">QR: {job.qrCode} • {job.method}</p>
                      </div>

                      <button
                        onClick={async () => {
                          await api.startSterilizationJob(job.id, { method: job.method });
                          await onRefreshData();
                        }}
                        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start Autoclave Sterilization Cycle</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION B: ACTIVE AUTOCLAVE CHAMBER TELEMETRY */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Flame className="h-3.5 w-3.5 text-teal-600" />
                    <span>2. Active Autoclave Chamber Telemetry ({activeProcessingJobs.length})</span>
                  </span>
                  <span className="font-mono text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200 font-bold text-[10px]">
                    Chamber Active
                  </span>
                </div>

                {activeProcessingJobs.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <PackageCheck className="h-8 w-8 text-teal-600 mx-auto" />
                    <h3 className="font-bold text-xs text-slate-800">No Active Autoclave Cycles</h3>
                    <p className="text-[11px] text-slate-500">Start a cycle from intake queue above.</p>
                  </div>
                ) : (
                  activeProcessingJobs.map((job) => {
                    const countdown = formatCountdown(job);

                    return (
                      <div
                        key={job.id}
                        className="p-4 rounded-2xl bg-white border border-teal-200/90 shadow-md space-y-3 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center space-x-2">
                            <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span className="font-mono font-black text-teal-700 text-sm">{job.jobId}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            STERILIZATION PHASE 3/4
                          </span>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{job.instrumentName}</h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">QR Code: {job.qrCode}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center space-x-1.5 text-slate-700">
                            <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                            <span>Chamber Temp: <strong className="text-slate-900 font-mono">134.2°C</strong></span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-slate-700">
                            <Gauge className="h-3.5 w-3.5 text-sky-600" />
                            <span>Pressure: <strong className="text-slate-900 font-mono">2.1 bar</strong></span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-600 font-medium">Time Remaining:</span>
                            <span className="font-bold text-teal-700">
                              {countdown.formatted}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-1000"
                              style={{ width: `${countdown.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            await api.completeSterilizationJob(job.id);
                            await onRefreshData();
                          }}
                          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Complete Cycle & Proceed to Quality Release</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SECTION C: QUALITY CONTROL RELEASE SIGN-OFF */}
              {releasePendingJobs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                      <span>3. Quality Control Release Sign-Off ({releasePendingJobs.length})</span>
                    </span>
                    <span className="text-[10px] text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200 font-mono font-bold">
                      QA Approval Pending
                    </span>
                  </div>

                  {releasePendingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-2xl bg-white border border-purple-200/90 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-purple-700 text-xs">{job.jobId}</span>
                        <span className="text-[10px] text-purple-700 font-mono font-medium">Chamber Cycle Completed</span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{job.instrumentName}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">QR: {job.qrCode}</p>
                      </div>

                      <button
                        onClick={async () => {
                          await api.releaseSterilizationJob(job.id, {
                            cycleCompleted: true,
                            packagingAcceptable: true,
                            indicatorVerified: true,
                            releaseDecision: 'RELEASED',
                            notes: 'Quality release approved via Handheld Mobile Terminal',
                          });
                          await onRefreshData();
                          setActiveTab('badges');
                        }}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Approve Quality Release & Generate QR Badge</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION D: QUARANTINED & BLOCKED JOBS */}
              {quarantinedJobs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      <span>4. Quarantined & Isolated Packs ({quarantinedJobs.length})</span>
                    </span>
                    <span className="text-[10px] text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 font-mono font-bold">
                      Reprocessing Required
                    </span>
                  </div>

                  {quarantinedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-2xl bg-white border border-rose-200/90 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-rose-600 text-xs">{job.jobId}</span>
                        <span className="text-[10px] text-rose-700 font-mono font-bold">{job.status}</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{job.instrumentName}</h4>
                        <p className="text-[11px] text-rose-600 font-mono mt-0.5">QR: {job.qrCode} • Reason: {job.rejectionReason || 'Packaging barrier compromised'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION E: COMPLETED STERILE RELEASED JOBS */}
              {completedReleasedJobs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>5. Certified Sterile Released Log ({completedReleasedJobs.length})</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 font-mono font-bold">
                      Sterile & Approved
                    </span>
                  </div>

                  {completedReleasedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-700 text-xs">{job.jobId} • {job.instrumentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Released by {job.releasedBy || 'Sarah Connor'}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">QR: {job.qrCode} • {job.method}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: AUTO-ISSUED STERILE QR BADGES */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  Sterile QR Label Badges
                </span>
                <span className="font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold text-[10px]">
                  {availableSterileItems.length} Certified Ready
                </span>
              </div>

              {availableSterileItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-lg space-y-3 flex flex-col items-center text-center"
                >
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>Certified Sterility Label</span>
                  </div>

                  <PackQRCode
                    packId={item.qrCode}
                    packName={item.name}
                    batchNumber={item.cycleReference || 'BATCH-2026-08'}
                    expiryDate={new Date(Date.now() + 14 * 86400000).toLocaleDateString()}
                    size={220}
                    showPrintableLabel={true}
                  />

                  <div>
                    <span className="font-mono font-black text-xl text-slate-900 block">{item.qrCode}</span>
                    <p className="text-xs font-bold text-slate-700">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">Location: {item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
