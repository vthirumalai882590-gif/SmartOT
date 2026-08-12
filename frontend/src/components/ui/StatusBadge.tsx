import React from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

export interface StatusBadgeProps {
  status: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  size = 'sm',
  pulse = false,
  className = '',
}) => {
  // Auto-detect tone if not provided
  let computedTone: BadgeTone = tone || 'neutral';
  if (!tone) {
    const s = status.toUpperCase();
    if (['SUFFICIENT', 'VERIFIED', 'RESOLVED', 'LOW', 'ONLINE', 'READY', 'AVAILABLE'].some((k) => s.includes(k))) {
      computedTone = 'success';
    } else if (['POTENTIAL_SHORTAGE', 'PENDING', 'ACKNOWLEDGED', 'MEDIUM', 'WARNING', 'PREPARING'].some((k) => s.includes(k))) {
      computedTone = 'warning';
    } else if (['CRITICAL', 'SHORTAGE', 'DEFICIT', 'BLOCKED', 'EXPIRED', 'MISSING', 'HIGH', 'DELAYED', 'OFFLINE'].some((k) => s.includes(k))) {
      computedTone = 'danger';
    } else if (['IN_USE', 'IN_TRANSFER', 'SYNCING', 'SCHEDULED'].some((k) => s.includes(k))) {
      computedTone = 'info';
    } else if (['STERILIZING', 'STERILIZED', 'REPROCESSING'].some((k) => s.includes(k))) {
      computedTone = 'purple';
    }
  }

  const toneStyles: Record<BadgeTone, { bg: string; text: string; border: string; dot: string }> = {
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    info: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    neutral: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-500',
    },
  };

  const current = toneStyles[computedTone];
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-bold tracking-tight rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses} shadow-sm ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} ${pulse ? 'animate-ping' : ''}`} />
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};
