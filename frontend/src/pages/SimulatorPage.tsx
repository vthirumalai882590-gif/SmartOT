import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { SimulationResult } from '../../../shared/src/types';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  CalendarPlus,
  ShieldAlert,
  RotateCcw,
  Info,
} from 'lucide-react';
import { AnimatedRing } from '../components/ui/AnimatedRing';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const SimulatorPage: React.FC = () => {
  const [turnoverReduction, setTurnoverReduction] = useState<number>(10);
  const [transferOptimization, setTransferOptimization] = useState<number>(5);
  const [prepChecklistAutomation, setPrepChecklistAutomation] = useState<number>(1);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await api.simulateWhatIf({
        turnoverReductionMinutes: turnoverReduction,
        transferOptimizationMinutes: transferOptimization,
        prepChecklistAutomationHours: prepChecklistAutomation,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [turnoverReduction, transferOptimization, prepChecklistAutomation]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 heading-serif flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <span>What-If Operational Capacity Simulator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate throughput impacts and capacity gains by optimizing room turnover and ward transport workflows
          </p>
        </div>

        {/* Methodology Info Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Info className="h-4 w-4 text-teal-600" />
            <span>Simulation Basis</span>
          </button>
          {showInfo && (
            <div className="absolute right-0 top-10 w-80 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xl text-xs text-slate-700 z-50 animate-fade-in-up backdrop-blur-md">
              <p className="font-bold text-slate-900 mb-1">Mathematical Simulation Basis</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Projected against a standard 10-hour daily operating block across 4 theatres (2,400 suite minutes). Calculated by <span className="text-teal-700 font-mono">simulator.ts</span>.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Configuration Panel */}
        <motion.div
          variants={itemVariants}
          className="p-6 glass-card space-y-6 shadow-sm border border-slate-200 text-slate-800"
        >
          <h3 className="text-sm font-bold text-slate-900 heading-serif flex items-center justify-between border-b border-slate-200 pb-3">
            <span>Simulation Parameters</span>
            <button
              onClick={() => {
                setTurnoverReduction(0);
                setTransferOptimization(0);
                setPrepChecklistAutomation(0);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1 transition font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </h3>

          {/* Slider 1: Turnover Reduction */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">OT Turnover Reduction</span>
              <span className="font-mono font-bold text-teal-700">-{turnoverReduction} mins / case</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={turnoverReduction}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTurnoverReduction(Number(e.target.value))}
              className="w-full accent-teal-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Baseline benchmark: 25 mins per room changeover</p>
          </div>

          {/* Slider 2: Transfer Optimization */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Ward Transfer Optimization</span>
              <span className="font-mono font-bold text-cyan-700">-{transferOptimization} mins / patient</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={transferOptimization}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferOptimization(Number(e.target.value))}
              className="w-full accent-cyan-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Baseline benchmark: 15 mins ward-to-OT transit</p>
          </div>

          {/* Slider 3: Early Readiness Buffer */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Early Readiness Verification</span>
              <span className="font-mono font-bold text-emerald-700">+{prepChecklistAutomation} hr earlier</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.5"
              value={prepChecklistAutomation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrepChecklistAutomation(Number(e.target.value))}
              className="w-full accent-emerald-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Completes consent & checklist before OT call</p>
          </div>
        </motion.div>

        {/* Output Metrics & Simulation Impact */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 p-6 glass-card space-y-6 flex flex-col justify-between shadow-sm border border-slate-200 text-slate-800"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 heading-serif mb-4 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <span>Simulated Operational Impact</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1: Ring + Number */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
                <AnimatedRing
                  value={result?.simulatedUtilization || 83.2}
                  max={100}
                  size={60}
                  strokeWidth={5}
                />
                <span className="text-[10px] uppercase font-bold text-slate-500">Simulated Utilization</span>
                <span className="text-[11px] font-extrabold text-emerald-700">
                  +{result?.utilizationGainPercentage || 4.8}% vs baseline
                </span>
              </div>

              {/* Metric 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500">Time Recovered</span>
                <div className="text-2xl font-extrabold text-cyan-700">
                  {result?.savedDelayMinutesPerDay || 105} mins
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Daily surgical block minutes saved</span>
              </div>

              {/* Metric 3 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500">Weekly Capacity</span>
                <div className="text-2xl font-extrabold text-emerald-700">
                  +{result?.additionalCasesCapacityPerWeek || 6} Cases
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Additional elective surgeries</span>
              </div>
            </div>

            {/* Explanation Narrative */}
            {result?.explanation && (
              <div className="mt-5 p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 font-medium leading-relaxed">
                {result.explanation}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 flex items-start space-x-2">
            <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              SIMULATION / ESTIMATE ONLY: Calculations provide directional operational projections based on synthetic workflow parameters. They do not constitute guaranteed clinical scheduling outcomes.
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
