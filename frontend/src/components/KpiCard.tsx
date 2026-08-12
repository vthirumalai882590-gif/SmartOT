import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedRing } from './ui/AnimatedRing';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  statusColor?: 'teal' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  previousValue?: number;
  animate?: boolean;
  showRing?: boolean;
  maxRingValue?: number;
  progressValue?: number; // 0 - 100
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  statusColor = 'teal',
  animate = true,
  showRing = false,
  maxRingValue = 100,
  progressValue,
  onClick,
  className = '',
}) => {
  // Extract number if value is formatted like "82%" or 82
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numericTarget) && numericTarget !== null;

  const [displayNumber, setDisplayNumber] = useState<number>(isNumeric ? numericTarget : 0);

  useEffect(() => {
    if (!isNumeric || !animate) return;

    let startTimestamp: number | null = null;
    const duration = 650;
    const startVal = displayNumber;
    const targetVal = numericTarget;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeVal = startVal + (targetVal - startVal) * (1 - Math.pow(1 - progress, 3));
      setDisplayNumber(Math.round(easeVal * 10) / 10);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, isNumeric, animate]);

  const colorMap = {
    teal: 'from-teal-50/70 to-white border-teal-200/80 shadow-teal-500/5',
    emerald: 'from-emerald-50/70 to-white border-emerald-200/80 shadow-emerald-500/5',
    amber: 'from-amber-50/70 to-white border-amber-200/80 shadow-amber-500/5',
    rose: 'from-rose-50/70 to-white border-rose-200/80 shadow-rose-500/5',
    blue: 'from-blue-50/70 to-white border-blue-200/80 shadow-blue-500/5',
    purple: 'from-purple-50/70 to-white border-purple-200/80 shadow-purple-500/5',
  };

  const iconBgMap = {
    /* MediwoxPlus icon tinted circle (source: PatientDashboard.tsx L83)
       'bg-blue-50 p-3 rounded-full ... group-hover:rotate-6' */
    teal:    'bg-teal-100/90 text-teal-700 border border-teal-200',
    emerald: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200',
    amber:   'bg-amber-100/90 text-amber-700 border border-amber-200',
    rose:    'bg-rose-100/90 text-rose-700 border border-rose-200',
    blue:    'bg-blue-100/90 text-blue-700 border border-blue-200',
    purple:  'bg-purple-100/90 text-purple-700 border border-purple-200',
  };

  const progressColorMap = {
    teal: 'bg-teal-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  const formattedDisplay =
    typeof value === 'string' && value.includes('%')
      ? `${Math.round(displayNumber)}%`
      : typeof value === 'string' && value.includes('/')
      ? value
      : isNumeric
      ? displayNumber
      : value;

  const autoProgress = progressValue !== undefined ? progressValue : isNumeric && numericTarget <= 100 ? numericTarget : undefined;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 0 16px rgba(20, 184, 166, 0.08)',
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group p-5 rounded-2xl bg-gradient-to-b ${colorMap[statusColor]} border backdrop-blur-md shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between">
          <div>
            {/* MediwoxPlus: font-serif label for KPI titles (source: PatientDashboard.tsx L58) */}
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 heading-serif">{title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{formattedDisplay}</h3>
            </div>
          </div>
          {showRing && isNumeric ? (
            <AnimatedRing value={numericTarget} max={maxRingValue} size={48} strokeWidth={4} />
          ) : (
            /* MediwoxPlus icon-in-rounded-full-circle with group-hover:rotate-6 */
            <div className={`kpi-icon-ring ${iconBgMap[statusColor]} transition-transform duration-300 group-hover:rotate-6 shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {autoProgress !== undefined && (
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 border border-slate-200/80">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${progressColorMap[statusColor]}`}
              style={{ width: `${Math.min(Math.max(autoProgress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
          <span className="truncate pr-2">{subtitle}</span>
          {trend && <span className="font-bold text-slate-700 shrink-0">{trend}</span>}
        </div>
      )}
    </motion.div>
  );
};
