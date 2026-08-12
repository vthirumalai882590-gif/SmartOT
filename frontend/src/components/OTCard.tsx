import React from 'react';
import { OperatingTheatre, Surgery, OTState } from '../../../shared/src/types';
import {
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  CalendarPlus,
  ArrowUpDown,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

interface OTCardProps {
  ot: OperatingTheatre & { activeSurgery?: Surgery };
  onTransition?: (otId: string, targetState: OTState, surgeryId?: string) => void;
  onViewDetails?: (ot: OperatingTheatre) => void;
  onScheduleCase?: (ot: OperatingTheatre) => void;
}

export const OTCard: React.FC<OTCardProps> = ({ ot, onTransition, onViewDetails, onScheduleCase }) => {
  const getStatusBadge = (status: OTState) => {
    switch (status) {
      case 'SURGERY_STARTED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500 animate-ping',
          label: 'In Surgery',
        };
      case 'AVAILABLE':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-300',
          dot: 'bg-teal-500',
          label: 'Available',
        };
      case 'SCHEDULED':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          label: 'Scheduled',
        };
      case 'TURNOVER':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500 animate-pulse',
          label: 'Turnover / Sanitization',
        };
      case 'PREPARING':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500 animate-pulse',
          label: 'Preparing / Staging',
        };
      case 'PATIENT_READY':
        return {
          bg: 'bg-cyan-50 text-cyan-800 border-cyan-300',
          dot: 'bg-cyan-500',
          label: 'Patient Waiting',
        };
      case 'PATIENT_TRANSFER':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-300',
          dot: 'bg-sky-500 animate-pulse',
          label: 'In Transit to OT',
        };
      case 'PATIENT_ARRIVED':
      case 'OT_READY':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          label: 'Patient in OT',
        };
      case 'SURGERY_COMPLETED':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-300',
          dot: 'bg-teal-500',
          label: 'Surgery Completed',
        };
      case 'DELAYED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500 animate-ping',
          label: 'Delayed',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
          label: String(status).replace(/_/g, ' '),
        };
    }
  };

  const statusBadge = getStatusBadge(ot.currentStatus);

  return (
    <div
      onClick={() => onViewDetails && onViewDetails(ot)}
      className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-teal-400 transition-all flex flex-col justify-between relative overflow-hidden text-slate-800 cursor-pointer group"
    >
      {/* Top Banner & Status */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold text-slate-900 tracking-tight heading-serif group-hover:text-teal-700 transition">
              {ot.code}
            </span>
            <span className="text-xs text-slate-500 font-medium truncate max-w-[140px]">({ot.name})</span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-1 font-semibold">{ot.specialty}</p>

        {/* Current Active Surgery or Room Activity */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          {ot.activeSurgery ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider flex items-center space-x-1">
                    <Stethoscope className="h-3 w-3" />
                    <span>Current Case</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 heading-serif truncate max-w-[210px]">
                    {ot.activeSurgery.procedureName}
                  </p>
                </div>
                {ot.currentDelayMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold shrink-0">
                    +{ot.currentDelayMinutes}m Delay
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div className="flex items-center space-x-1.5 truncate">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{ot.activeSurgery.patientName || 'Inpatient'}</span>
                </div>
                <div className="flex items-center space-x-1.5 truncate">
                  <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{ot.activeSurgery.surgeonName}</span>
                </div>
              </div>
            </>
          ) : ot.currentStatus === 'TURNOVER' ? (
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                Turnover in Progress
              </span>
              <p className="text-xs font-medium text-slate-800 mt-0.5">
                Room disinfection & sterile supply restocking
              </p>
              <div className="flex items-center space-x-2 text-xs text-amber-700 font-semibold mt-2">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Target benchmark: {ot.expectedTurnoverMinutes} mins</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-slate-500">
              <CheckCircle className="h-5 w-5 text-teal-600 mx-auto mb-1" />
              <span>Room sanitized and staged for next surgical intake</span>
            </div>
          )}
        </div>

        {/* Risk Assessment Indicator */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Delay Risk:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
              ot.riskLevel === 'HIGH'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : ot.riskLevel === 'MEDIUM'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {ot.riskLevel} RISK
          </span>
        </div>
      </div>

      {/* Quick Action Footer with Primary State Trigger */}
      <div
        className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onViewDetails && onViewDetails(ot)}
          className="text-xs text-slate-600 hover:text-teal-700 font-bold transition flex items-center space-x-1"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Drawer</span>
        </button>

        <div className="flex items-center space-x-1.5 ml-auto">
          {ot.currentStatus === 'AVAILABLE' && (
            <button
              onClick={() => (onScheduleCase ? onScheduleCase(ot) : onTransition && onTransition(ot.id, 'PREPARING'))}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span>Schedule Case</span>
            </button>
          )}

          {ot.currentStatus === 'SCHEDULED' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'PREPARING', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
            >
              Start Preparation
            </button>
          )}

          {ot.currentStatus === 'PREPARING' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'PATIENT_READY', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
            >
              Mark Ready
            </button>
          )}

          {ot.currentStatus === 'PATIENT_READY' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'PATIENT_TRANSFER', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Start Transfer</span>
            </button>
          )}

          {ot.currentStatus === 'PATIENT_TRANSFER' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'PATIENT_ARRIVED', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition"
            >
              Patient Arrived
            </button>
          )}

          {ot.currentStatus === 'PATIENT_ARRIVED' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'SURGERY_STARTED', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Start Surgery</span>
            </button>
          )}

          {ot.currentStatus === 'OT_READY' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'SURGERY_STARTED', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Start Surgery</span>
            </button>
          )}

          {ot.currentStatus === 'SURGERY_STARTED' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'SURGERY_COMPLETED', ot.activeSurgery?.id)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Finish Surgery</span>
            </button>
          )}

          {ot.currentStatus === 'SURGERY_COMPLETED' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'TURNOVER')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Start Turnover</span>
            </button>
          )}

          {ot.currentStatus === 'TURNOVER' && onTransition && (
            <button
              onClick={() => onTransition(ot.id, 'AVAILABLE')}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition"
            >
              Set Available
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
