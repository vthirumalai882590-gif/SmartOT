import React, { useEffect, useState } from 'react';

export interface AnimatedRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  unit?: string;
  showValue?: boolean;
}

export const AnimatedRing: React.FC<AnimatedRingProps> = ({
  value,
  max = 100,
  size = 56,
  strokeWidth = 5,
  colorClass,
  unit = '%',
  showValue = true,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  // Smooth numeric counter animation
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 650;
    const startVal = displayValue;
    const targetVal = Math.min(Math.max(value, 0), max);

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out quad
      const currentVal = startVal + (targetVal - startVal) * (1 - Math.pow(1 - progress, 2));
      setDisplayValue(Math.round(currentVal * 10) / 10);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, max]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(displayValue / max, 0), 1);
  const strokeDashoffset = circumference - percentage * circumference;

  // Auto tone if colorClass not explicitly passed
  const strokeColor =
    colorClass ||
    (displayValue >= 80
      ? 'text-teal-400'
      : displayValue >= 50
      ? 'text-amber-400'
      : 'text-rose-400');

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(30, 41, 59, 0.8)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className={`${strokeColor} transition-all duration-300`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-extrabold tracking-tight text-white leading-none">
            {Math.round(displayValue)}
            <span className="text-[8px] font-medium text-slate-400">{unit}</span>
          </span>
        </div>
      )}
    </div>
  );
};
