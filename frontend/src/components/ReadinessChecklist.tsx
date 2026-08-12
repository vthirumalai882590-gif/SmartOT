import React from 'react';
import { PatientReadiness, ConsentStatus } from '../../../shared/src/types';
import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="glass-card p-5 space-y-5 shadow-sm border border-slate-200 text-slate-800">
      {/* Header & Readiness Badge */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
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

          <div>
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

      {/* Item 1: Digital Consent Status */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-700 mt-0.5 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 heading-serif">Surgical & Anesthetic Consent Status</p>
            <p className="text-xs text-slate-500">
              Operational confirmation of signed procedural consent documentation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={readiness.consentStatus}
            disabled={disabled}
            onChange={(e) => onConsentChange(e.target.value as ConsentStatus)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition focus:outline-none shadow-sm ${
              readiness.consentStatus === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : readiness.consentStatus === 'PENDING'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <option value="VERIFIED">VERIFIED (Consent Confirmed)</option>
            <option value="PENDING">PENDING (Awaiting Review)</option>
            <option value="MISSING">MISSING (Consent Incomplete)</option>
          </select>
        </div>
      </div>

      {/* Remaining 5 Checklist Checkboxes */}
      <div className="space-y-2.5">
        {checklistItems.map((item) => (
          <label
            key={item.id}
            className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer shadow-sm ${
              item.checked
                ? 'bg-white border-teal-300 text-slate-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              disabled={disabled}
              onChange={(e) => onUpdateItem(item.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
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
