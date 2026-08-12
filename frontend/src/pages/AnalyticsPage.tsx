import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { BottleneckItem, OTUtilizationMetric, CSSDDemandForecast, NextBestAction } from '../../../shared/src/types';
import {
  BarChart3,
  TrendingUp,
  Activity,
  PackageCheck,
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { GradientBarChart } from '../components/ui/GradientBarChart';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const AnalyticsPage: React.FC = () => {
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [utilization, setUtilization] = useState<OTUtilizationMetric[]>([]);
  const [demand, setDemand] = useState<CSSDDemandForecast[]>([]);
  const [nextActions, setNextActions] = useState<NextBestAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPack, setSelectedPack] = useState<CSSDDemandForecast | null>(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [bRes, uRes, dRes, nbaRes] = await Promise.all([
          api.getBottlenecks(),
          api.getUtilization(),
          api.getCSSDDemand(),
          api.getNextBestActions(),
        ]);
        setBottlenecks(bRes || []);
        setUtilization(uRes || []);
        setDemand(dRes || []);
        setNextActions(nbaRes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Header with Source Traceability */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {/* MediwoxPlus font-serif h1 */}
          <h1 className="text-xl font-extrabold text-slate-900 heading-serif flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span>Operational Intelligence & Bottleneck Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated delay attribution, Operating Theatre utilization rates, and CSSD supply demand forecasting
          </p>
        </div>

        {/* Calculation Basis Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setActiveInfoTooltip(activeInfoTooltip === 'header' ? null : 'header')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Info className="h-4 w-4 text-teal-600" />
            <span>Calculation Methodology</span>
          </button>
          {activeInfoTooltip === 'header' && (
            <div className="absolute right-0 top-10 w-80 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xl text-xs text-slate-700 z-50 animate-fade-in-up backdrop-blur-md">
              <p className="font-bold text-slate-900 mb-1">Traceable Analytical Basis</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Calculations are aggregated by the <span className="text-teal-700 font-semibold">delay-engine.ts</span> correlation window across the past 24 hours against standard benchmarks (15m transfer, 25m turnover).
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Segmented Sub-views (Tabs) */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview" icon={Layers}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="bottlenecks" icon={TrendingUp} badge={`${bottlenecks.length} Categories`}>
            Delay Bottlenecks
          </TabsTrigger>
          <TabsTrigger value="utilization" icon={Activity} badge="4 Theatres">
            OT Utilization
          </TabsTrigger>
          <TabsTrigger value="cssd" icon={PackageCheck} badge={`${demand.length} Sets`}>
            CSSD Demand Forecast
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottlenecks Chart Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.01,
                boxShadow: '0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 0 16px rgba(20, 184, 166, 0.06)',
              }}
              className="p-5 glass-card space-y-4 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 heading-serif">Delay Bottlenecks Attribution</h3>
                      <p className="text-[10px] text-slate-500">Share of lost surgical block minutes</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 shadow-sm">
                    Last 24h
                  </span>
                </div>

                <div className="mt-4">
                  {/* CarboTrack chart-1→chart-2 gradient + multiColor cycles chart-1…5 per bar */}
                  <GradientBarChart
                    data={bottlenecks}
                    dataKeyX="name"
                    dataKeyY="percentage"
                    layout="vertical"
                    gradientFrom="hsl(220, 70%, 50%)"
                    gradientTo="hsl(160, 60%, 45%)"
                    unit="%"
                    height={220}
                    multiColor={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                {bottlenecks.map((b) => (
                  <div key={b.category} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-500 truncate font-medium">{b.name}</p>
                    <p className="text-xs font-extrabold text-teal-700">{b.percentage}%</p>
                    <p className="text-[9px] text-slate-400">{b.totalDelayMinutes}m lost</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* OT Utilization Chart Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.01,
                boxShadow: '0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 0 16px rgba(16, 185, 129, 0.06)',
              }}
              className="p-5 glass-card space-y-4 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 heading-serif">Operating Theatre Utilization</h3>
                      <p className="text-[10px] text-slate-500">Daily surgical block utilization rate per room</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                    Daily Average
                  </span>
                </div>

                <div className="mt-4">
                  <GradientBarChart
                    data={utilization}
                    dataKeyX="otCode"
                    dataKeyY="utilizationRate"
                    layout="horizontal"
                    gradientFrom="hsl(160, 60%, 45%)"
                    gradientTo="hsl(173, 80%, 40%)"
                    unit="%"
                    height={220}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                {utilization.map((u) => (
                  <div key={u.otId} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-500 font-medium">{u.otCode}</p>
                    <p className="text-xs font-extrabold text-emerald-700">{u.utilizationRate}%</p>
                    <p className="text-[9px] text-slate-400">{u.surgeriesCount} Surgeries</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* AI Operations Intelligence & Next-Best-Actions */}
          {nextActions.length > 0 && (
            <motion.div variants={itemVariants} className="p-5 glass-card space-y-4 border-l-4 border-l-teal-600">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-teal-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 heading-serif">
                      AI Operations Consultant — Next-Best Actions
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Ranked operational interventions to prevent cascading delays & idle theatre time
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 shadow-sm flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  <span>Groq AI Evaluated</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {nextActions.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 flex flex-col justify-between shadow-sm hover:border-teal-400 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {action.department}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            action.priority === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {action.priority} IMPACT
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">{action.action}</p>
                      <p className="text-[11px] text-slate-500 leading-snug mt-1">{action.rationale}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Impact: <strong>{action.impactScore}/100</strong></span>
                      <div className="flex items-center space-x-1 text-teal-700 font-bold">
                        <span>Actionable</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </TabsContent>


        {/* 2. BOTTLENECKS DETAILED TAB */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <div className="p-6 glass-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 heading-serif flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                  <span>Full Delay Factor Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed attribution of schedule variance across 24-hour surgical operations
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Total Cumulative Delay: <span className="font-bold text-rose-600">544 minutes</span>
              </span>
            </div>

            <div className="h-72">
              <GradientBarChart
                data={bottlenecks}
                dataKeyX="name"
                dataKeyY="percentage"
                layout="vertical"
                gradientFrom="hsl(220, 70%, 50%)"
                gradientTo="hsl(160, 60%, 45%)"
                unit="%"
                height={280}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {bottlenecks.map((b) => (
                <div
                  key={b.category}
                  className="p-4 rounded-xl bg-white border border-slate-200 flex items-start justify-between space-x-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">{b.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Logged in {b.caseCount} surgical cases ({b.totalDelayMinutes} total minutes lost)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-cyan-700">{b.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 3. UTILIZATION DETAILED TAB */}
        <TabsContent value="utilization" className="space-y-4">
          <div className="p-6 glass-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 heading-serif flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <span>Theatre Block Utilization Metrics</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Target utilization benchmark: 80.0% per theatre suite
                </p>
              </div>
            </div>

            <div className="h-72">
              <GradientBarChart
                data={utilization}
                dataKeyX="otCode"
                dataKeyY="utilizationRate"
                layout="horizontal"
                gradientFrom="hsl(160, 60%, 45%)"
                gradientTo="hsl(173, 80%, 40%)"
                unit="%"
                height={280}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              {utilization.map((u) => (
                <div key={u.otId} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{u.otCode}</span>
                    <StatusBadge
                      status={u.utilizationRate >= 80 ? 'OPTIMAL' : 'SUB-OPTIMAL'}
                      tone={u.utilizationRate >= 80 ? 'success' : 'warning'}
                    />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.otName}</p>
                  <div className="pt-2 flex justify-between text-xs border-t border-slate-100">
                    <span className="text-slate-500">Utilization:</span>
                    <span className="font-extrabold text-emerald-700">{u.utilizationRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 4. CSSD DEMAND FORECAST TAB */}
        <TabsContent value="cssd" className="space-y-4">
          <div className="p-5 glass-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div className="flex items-center space-x-2">
                <PackageCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 heading-serif">CSSD Sterile Pack Demand Forecasting</h3>
                  <p className="text-xs text-slate-500">
                    Tomorrow's scheduled procedural demand vs available sterilized stock
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                *Click any row for sterile tray batch specs & action history
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Instrument Set Type</th>
                    <th className="py-3 px-4">Required Tomorrow</th>
                    <th className="py-3 px-4">Available Now</th>
                    <th className="py-3 px-4">In Reprocessing</th>
                    <th className="py-3 px-4">Deficit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Operational Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {demand.map((d) => (
                    <tr
                      key={d.packType}
                      onClick={() => setSelectedPack(d)}
                      className="hover:bg-slate-50 transition-all cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                        <span>{d.packType}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900">{d.requiredTomorrow}</td>
                      <td className="py-3.5 px-4 font-mono text-teal-700 font-bold">{d.availableNow}</td>
                      <td className="py-3.5 px-4 font-mono text-amber-700">{d.inReprocessing}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700">{d.deficit}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-xs truncate">
                        {d.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {demand.map((d) => (
                <div
                  key={d.packType}
                  onClick={() => setSelectedPack(d)}
                  className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 cursor-pointer hover:border-teal-400 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{d.packType}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 border-y border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Required</span>
                      <span className="font-mono font-bold text-slate-900">{d.requiredTomorrow}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Available</span>
                      <span className="font-mono font-bold text-teal-700">{d.availableNow}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Deficit</span>
                      <span className="font-mono font-bold text-rose-700">{d.deficit}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{d.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Row-Click Detail Modal (MediwoxPlus pattern) */}
      <DetailModal
        isOpen={!!selectedPack}
        onClose={() => setSelectedPack(null)}
        title={selectedPack ? `${selectedPack.packType} — Inventory Detail` : ''}
        subtitle="CSSD Sterile Supply Analysis & Reprocessing Traceability"
      >
        {selectedPack && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-medium">Inventory Status</span>
              <StatusBadge status={selectedPack.status} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Required Tomorrow</span>
                <span className="text-xl font-extrabold text-slate-900 heading-serif">{selectedPack.requiredTomorrow} Sets</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Currently Available</span>
                <span className="text-xl font-extrabold text-teal-700">{selectedPack.availableNow} Sets</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">In Reprocessing</span>
                <span className="text-xl font-extrabold text-amber-700">{selectedPack.inReprocessing} Sets</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Projected Deficit</span>
                <span className="text-xl font-extrabold text-rose-700">{selectedPack.deficit} Sets</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-teal-800 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Operational Recommendation</span>
              </span>
              <p className="text-xs text-teal-900 leading-relaxed font-semibold">{selectedPack.recommendation}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </motion.div>
  );
};
