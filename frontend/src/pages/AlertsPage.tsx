import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Alert, AlertStatus } from '../../../shared/src/types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Filter,
  Check,
  ArrowUpRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleUpdateStatus = async (e: React.MouseEvent, alertId: string, status: AlertStatus) => {
    e.stopPropagation();
    try {
      await api.updateAlertStatus(alertId, status);
      loadAlerts();
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status });
      }
    } catch (err: any) {
      alert(`Alert update failed: ${err.message}`);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    return statusFilter === 'ALL' || a.status === statusFilter;
  });

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
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span>Operational Alert & Delay Warning Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time rule-triggered operational alerts across Admissions, CSSD, and Operating Theatres
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1.5 p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Alerts Feed */}
      <motion.div variants={containerVariants} className="space-y-3">
        {filteredAlerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isWarning = alert.severity === 'WARNING';

          return (
            <motion.div
              variants={itemVariants}
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              whileHover={{
                scale: 1.01,
                boxShadow: '0 10px 24px -4px rgba(15, 23, 42, 0.08), 0 0 16px rgba(245, 158, 11, 0.08)',
              }}
              whileTap={{ scale: 0.99 }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                alert.status === 'RESOLVED'
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : isCritical
                  ? 'bg-rose-50/70 border-rose-200 shadow-sm'
                  : isWarning
                  ? 'bg-amber-50/70 border-amber-200 shadow-sm'
                  : 'bg-teal-50/70 border-teal-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={alert.severity}
                      tone={isCritical ? 'danger' : isWarning ? 'warning' : 'info'}
                      pulse={alert.status === 'OPEN' && isCritical}
                    />
                    <span className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors flex items-center space-x-1 heading-serif">
                      <span>{alert.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Role: <span className="text-slate-800 font-bold">{alert.responsibleRole}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{alert.description}</p>
                  <p className="text-xs font-bold text-teal-800">
                    Recommended Action: {alert.recommendedAction}
                  </p>
                </div>

                {/* Actions & Status Pill */}
                <div className="flex items-center space-x-2 self-start md:self-auto shrink-0 pt-2 md:pt-0">
                  <StatusBadge status={alert.status} size="md" />

                  {alert.status === 'OPEN' && (
                    <button
                      onClick={(e) => handleUpdateStatus(e, alert.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                    >
                      Acknowledge
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={(e) => handleUpdateStatus(e, alert.id, 'RESOLVED')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Row-Click Alert Detail Modal (MediwoxPlus pattern) */}
      <DetailModal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? selectedAlert.title : ''}
        subtitle="Operational Alert Metadata & Root Cause Traceability"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-medium">Severity & Status</span>
              <div className="flex items-center space-x-2">
                <StatusBadge status={selectedAlert.severity} />
                <StatusBadge status={selectedAlert.status} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Alert Description</span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">{selectedAlert.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Target Entity ({selectedAlert.entityType})</span>
                <span className="text-sm font-bold text-slate-900 heading-serif">{selectedAlert.entityId || 'Hospital Wide'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Responsible Role</span>
                <span className="text-sm font-bold text-teal-700">{selectedAlert.responsibleRole}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-teal-800 flex items-center space-x-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span>Next-Best Recommended Action</span>
              </span>
              <p className="text-xs text-teal-950 font-bold leading-relaxed">{selectedAlert.recommendedAction}</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              {selectedAlert.status !== 'RESOLVED' && (
                <button
                  onClick={(e) => handleUpdateStatus(e, selectedAlert.id, 'RESOLVED')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark Alert as Resolved</span>
                </button>
              )}
            </div>
          </div>
        )}
      </DetailModal>
    </motion.div>
  );
};
