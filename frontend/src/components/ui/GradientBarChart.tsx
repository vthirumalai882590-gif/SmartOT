import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';

/**
 * CarboTrack verbatim chart color palette (.dark block from globals.css):
 * --chart-1: 220 70% 50%   → hsl(220, 70%, 50%)  ≈ #2563EB (vivid blue)
 * --chart-2: 160 60% 45%   → hsl(160, 60%, 45%)  ≈ #1A9E6E (teal-green)
 * --chart-3: 30 80% 55%    → hsl(30, 80%, 55%)   ≈ #E8721A (amber-orange)
 * --chart-4: 280 65% 60%   → hsl(280, 65%, 60%)  ≈ #9B59D4 (purple)
 * --chart-5: 340 75% 55%   → hsl(340, 75%, 55%)  ≈ #E03070 (rose)
 * Source: CarboTrack-main/client/src/globals.css lines 54-58
 */
export const CHART_COLORS = {
  chart1: 'hsl(220, 70%, 50%)',
  chart2: 'hsl(160, 60%, 45%)',
  chart3: 'hsl(30, 80%, 55%)',
  chart4: 'hsl(280, 65%, 60%)',
  chart5: 'hsl(340, 75%, 55%)',
} as const;

/** Multi-series palette for cycling through chart-1…5 */
export const CHART_PALETTE = [
  CHART_COLORS.chart1,
  CHART_COLORS.chart2,
  CHART_COLORS.chart3,
  CHART_COLORS.chart4,
  CHART_COLORS.chart5,
];

export interface GradientBarChartProps {
  data: any[];
  dataKeyX: string;
  dataKeyY: string;
  /** Override gradient start — defaults to chart-1 HSL (CarboTrack verbatim) */
  gradientFrom?: string;
  /** Override gradient end — defaults to chart-2 HSL (CarboTrack verbatim) */
  gradientTo?: string;
  layout?: 'horizontal' | 'vertical';
  height?: number;
  barSize?: number;
  unit?: string;
  valueFormatter?: (val: number) => string;
  /** Multi-color mode: cycle through CarboTrack chart-1…5 per bar */
  multiColor?: boolean;
  secondaryKey?: string;
}

export const GradientBarChart: React.FC<GradientBarChartProps> = ({
  data,
  dataKeyX,
  dataKeyY,
  gradientFrom = CHART_COLORS.chart1,   // CarboTrack .dark chart-1 verbatim
  gradientTo   = CHART_COLORS.chart2,   // CarboTrack .dark chart-2 verbatim
  layout = 'horizontal',
  height = 240,
  barSize = 20,
  unit = '%',
  valueFormatter,
  multiColor = false,
}) => {
  const gradientId = `barGradient-${Math.random().toString(36).substring(2, 9)}`;
  const isVertical = layout === 'vertical';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const formatted = valueFormatter ? valueFormatter(val) : `${val}${unit}`;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-slate-300 mb-1">{label}</p>
          <div className="flex items-center space-x-2">
            {/* Tinted dot using CarboTrack chart-1 color */}
            <span className="w-2 h-2 rounded-full" style={{ background: gradientFrom }} />
            <span className="text-xs font-extrabold text-white">{formatted}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{
            top: 10,
            right: 15,
            left: isVertical ? 20 : -10,
            bottom: isVertical ? 5 : 20,
          }}
        >
          <defs>
            {/* CarboTrack gradient fill pattern: gradient from chart-1 to chart-2 */}
            <linearGradient id={gradientId} x1="0" y1="0" x2={isVertical ? '1' : '0'} y2={isVertical ? '0' : '1'}>
              <stop offset="0%"   stopColor={gradientFrom} stopOpacity={1} />
              <stop offset="100%" stopColor={gradientTo}   stopOpacity={0.8} />
            </linearGradient>

            {/* Individual CarboTrack chart-1…5 gradients for multi-color mode */}
            {multiColor && CHART_PALETTE.map((color, i) => (
              <linearGradient key={i} id={`multiGrad-${i}`} x1="0" y1="0" x2={isVertical ? '1' : '0'} y2={isVertical ? '0' : '1'}>
                <stop offset="0%"   stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} horizontal={!isVertical} vertical={isVertical} />

          {isVertical ? (
            <>
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => (valueFormatter ? valueFormatter(val) : `${val}${unit}`)}
              />
              <YAxis
                dataKey={dataKeyX}
                type="category"
                stroke="#64748b"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
                width={130}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={dataKeyX}
                stroke="#64748b"
                tick={{ fill: '#cbd5e1', fontSize: 10 }}
                interval={0}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => (valueFormatter ? valueFormatter(val) : `${val}${unit}`)}
              />
            </>
          )}

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />

          <Bar
            dataKey={dataKeyY}
            fill={`url(#${gradientId})`}
            radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            barSize={barSize}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {/* Multi-color: cycle through CarboTrack chart-1…5 per cell */}
            {multiColor && data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#multiGrad-${index % CHART_PALETTE.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
