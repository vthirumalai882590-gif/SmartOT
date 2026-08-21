import React from 'react';
import { PatientReadiness, ConsentStatus } from '../../../shared/src/types';
import { CheckCircle2, AlertCircle, ShieldCheck, CheckCheck } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';

interface ReadinessChecklistProps {
  readiness: PatientReadiness;
  onUpdateItem: (field: string, value: any) => void;
  onConsentChange: (consent: ConsentStatus) => void;
  disabled?: boolean;
}

export const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({
  readiness,
  onUpdateItem,
  onConsentChange,
  disabled = false,
}) => {
  const percent = Math.round((readiness.completedItemsCount / (readiness.totalItemsCount || 6)) * 100);

  const checklistItems = [
    {
      id: 'admissionCompleted',
      label: 'Patient Admission & Identity Wristband Verified',
      checked: readiness.admissionCompleted,
      desc: 'Inpatient record active and biometric band attached',
    },
    {
      id: 'documentationCompleted',
      label: 'Clinical Documentation & History Intake Completed',
      checked: readiness.documentationCompleted,
      desc: 'Nursing pre-op assessment recorded in system',
    },
    {
      id: 'reportsAvailable',
      label: 'Diagnostic Lab Reports & Imaging Uploaded',
      checked: readiness.reportsAvailable,
      desc: 'CBC, coagulation profile, and radiology staged',
    },
    {
      id: 'doctorConfirmed',
      label: 'Attending Surgeon & Anesthesia Clearance Confirmed',
      checked: readiness.doctorConfirmed,
      desc: 'Airway and surgical site validation verified',
    },
    {
      id: 'preopPrepCompleted',
      label: 'Surgical Site Marking & Fasting Protocol Completed',
      checked: readiness.preopPrepCompleted,
      desc: 'NPO compliance and sterile prep completed',
    },
  ];

  const handleMarkAllVerified = () => {
    onConsentChange('VERIFIED');
    checklistItems.forEach((item) => {
      if (!item.checked) {
        onUpdateItem(item.id, true);
      }
    });
  };

  return (
    <div className="glass-card p-5 space-y-5 shadow-sm border border-slate-200 text-slate-800">
      {/* Header & Readiness Badge */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 heading-serif flex items-center space-x-2">
              <span>Pre-Operative Readiness Checklist</span>
              <span className="text-xs text-slate-500 font-mono font-normal">
                ({readiness.completedItemsCount}/{readiness.totalItemsCount} Verified)
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              All 6 criteria must be certified before patient transfer to Operating Theatre
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={disabled}
              onClick={handleMarkAllVerified}
              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition flex items-center space-x-1 shadow-sm"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Verified</span>
            </button>

            <StatusBadge
              status={readiness.isReady ? 'READY FOR OT' : `NOT READY (${readiness.completedItemsCount}/6)`}
              tone={readiness.isReady ? 'success' : 'danger'}
              size="md"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-500">Verification Progress</span>
            <span className={readiness.isReady ? 'text-teal-700 font-bold' : 'text-slate-700 font-bold'}>
              {percent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                readiness.isReady ? 'bg-gradient-to-r from-teal-600 to-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Item 1: Digital Consent Status with Crisp Button Toggles */}
      <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-700 mt-0.5 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 heading-serif">Surgical & Anesthetic Consent Status</p>
            <p className="text-xs text-slate-500">
              Select signed procedural consent documentation clearance status
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConsentChange('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
              readiness.consentStatus === 'VERIFIED'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            VERIFIED
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onConsentChange('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
              readiness.consentStatus === 'PENDING'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            PENDING
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onConsentChange('MISSING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
              readiness.consentStatus === 'MISSING'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            MISSING
          </button>
        </div>
      </div>

      {/* Remaining 5 Checklist Checkboxes with Native Labels */}
      <div className="space-y-2.5">
        {checklistItems.map((item) => (
          <label
            key={item.id}
            className={`flex items-start space-x-3.5 p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm select-none ${
              item.checked
                ? 'bg-teal-50/60 border-teal-500 ring-1 ring-teal-500/30 text-slate-900'
                : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              disabled={disabled}
              onChange={(e) => onUpdateItem(item.id, e.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
            />
            <div className="text-xs">
              <span className={`font-bold ${item.checked ? 'text-slate-900' : 'text-slate-700'}`}>
                {item.label}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
