import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { AuditLog, WorkflowEvent } from '../../../shared/src/types';
import { Clock, ShieldCheck, Search, ArrowUpRight, Database, FileText } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'EVENTS'>('AUDIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WorkflowEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const [lData, eData] = await Promise.all([api.getAuditLogs(), api.getWorkflowEvents()]);
        setLogs(lData);
        setEvents(eData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q)
    );
  });

  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.eventType.toLowerCase().includes(q) ||
      e.entityId.toLowerCase().includes(q) ||
      e.actorName.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
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
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <span>Audit Trail & Immutable Workflow Events</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable regulatory compliance log of every user action and correlated operational transition
          </p>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search actor, action, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-sm w-48 sm:w-56"
            />
          </div>

          <div className="flex rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'AUDIT' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('EVENTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'EVENTS' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Workflow Events ({events.length})
            </button>
          </div>
        </div>
      </motion.div>

      {/* Table Card */}
      <motion.div
        variants={itemVariants}
        className="glass-card shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          {activeTab === 'AUDIT' ? (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity Type (ID)</th>
                  <th className="py-3 px-4">Payload Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-teal-700 flex items-center space-x-1.5 font-sans">
                      <span>{log.action}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition" />
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-sans font-bold">{log.actorName}</td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      <span className="text-slate-900 font-bold">{log.entityType}</span>{' '}
                      <span className="text-slate-400 text-[11px]">({log.entityId})</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 truncate max-w-xs font-mono">
                      {JSON.stringify(log.newState || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <StatusBadge status={evt.department} />
                    </td>
                    <td className="py-3 px-4 font-bold text-teal-700 flex items-center space-x-1.5 font-sans">
                      <span>{evt.eventType}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition" />
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">{evt.entityId}</td>
                    <td className="py-3 px-4 text-slate-900 font-sans font-bold">{evt.actorName}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 truncate max-w-xs font-sans">
                      {JSON.stringify(evt.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Audit Log Detail Modal */}
      <DetailModal
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        title={selectedAuditLog ? `Audit Record: ${selectedAuditLog.action}` : ''}
        subtitle="Cryptographically Timestamped User Action"
      >
        {selectedAuditLog && (
          <div className="space-y-4 font-sans text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Actor Name</span>
                <span className="text-sm font-bold text-slate-900 heading-serif">{selectedAuditLog.actorName}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Entity Type & ID</span>
                <span className="text-sm font-bold text-teal-700">
                  {selectedAuditLog.entityType} ({selectedAuditLog.entityId})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Timestamp</span>
              <span className="text-xs text-slate-700 font-mono">
                {new Date(selectedAuditLog.timestamp).toISOString()}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">New State Payload (JSON)</span>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 shadow-inner">
                {JSON.stringify(selectedAuditLog.newState || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Workflow Event Detail Modal */}
      <DetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? `Workflow Event: ${selectedEvent.eventType}` : ''}
        subtitle="Immutable Correlated Event Telemetry"
      >
        {selectedEvent && (
          <div className="space-y-4 font-sans text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Department</span>
                <StatusBadge status={selectedEvent.department} size="md" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Entity ID</span>
                <span className="text-sm font-bold text-cyan-700">{selectedEvent.entityId}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Event Metadata</span>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 shadow-inner">
                {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DetailModal>
    </motion.div>
  );
};
