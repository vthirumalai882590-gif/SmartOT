import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { ReadinessChecklist } from '../components/ReadinessChecklist';
import { SurgicalWorkflowTracker } from '../components/SurgicalWorkflowTracker';
import { Patient, ConsentStatus } from '../../../shared/src/types';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  X,
  ArrowUpRight,
  GitCommit,
  UserPlus,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [showWorkflowTracker, setShowWorkflowTracker] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Add Patient Modal State
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [addPatientForm, setAddPatientForm] = useState({
    mrn: '',
    name: '',
    age: 45,
    gender: 'M',
    wardId: 'Ward 4B',
    bedNumber: 'Bed 401',
    primaryDiagnosis: 'Acute Appendicitis',
  });

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPatientForm.name || !addPatientForm.mrn) {
      alert('Please enter Patient Name and MRN.');
      return;
    }
    try {
      const created = await api.createPatient(addPatientForm);
      if (created && (created.id || created.mrn)) {
        alert(`Patient ${created.name || addPatientForm.name} (${created.mrn || addPatientForm.mrn}) created successfully and added to database.`);
        setIsAddPatientModalOpen(false);
        setAddPatientForm({
          mrn: '',
          name: '',
          age: 45,
          gender: 'M',
          wardId: 'Ward 4B',
          bedNumber: 'Bed 401',
          primaryDiagnosis: 'Acute Appendicitis',
        });
        await loadPatients();
        setSelectedPatient(created);
      } else {
        alert('Failed to create patient: Database did not return a valid patient record.');
      }
    } catch (err: any) {
      alert(`Failed to create patient: ${err.message || err}`);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await api.getPatients();
      setPatients(data);
      if (selectedPatient) {
        const updated = data.find((p: any) => p.id === selectedPatient.id);
        if (updated) setSelectedPatient(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleUpdateChecklistItem = async (field: string, value: boolean) => {
    if (!selectedPatient) return;
    try {
      await api.updatePatientReadiness(selectedPatient.id, { [field]: value });
      loadPatients();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleConsentChange = async (consentStatus: ConsentStatus) => {
    if (!selectedPatient) return;
    try {
      await api.updatePatientConsent(selectedPatient.id, consentStatus);
      loadPatients();
    } catch (err: any) {
      alert(`Consent update failed: ${err.message}`);
    }
  };

  const handleStartTransfer = async (patient: Patient) => {
    try {
      await api.startTransfer({
        patientId: patient.id,
        surgeryId: patient.activeSurgeryId,
        fromWard: patient.wardId,
        toOtId: 'ot_03',
        toOtCode: 'OT-03',
      });
      alert(`Patient transfer started for ${patient.name} (${patient.mrn}) to OT-03.`);
      loadPatients();
    } catch (err: any) {
      alert(`Transfer initiation failed: ${err.message || err}`);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.primaryDiagnosis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWard = wardFilter === 'ALL' || p.wardId.includes(wardFilter);
    return matchesSearch && matchesWard;
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
              <Users className="h-5 w-5" />
            </div>
            <span>Inpatient Surgical Readiness & Consent</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Admissions and Pre-Op Ward checklist validation prior to OT transfer
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const autoMrn = `MRN-${Math.floor(1000 + Math.random() * 9000)}`;
              setAddPatientForm((prev) => ({ ...prev, mrn: autoMrn }));
              setIsAddPatientModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add Patient</span>
          </button>

          <button
            onClick={() => setShowWorkflowTracker(!showWorkflowTracker)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition shadow-sm ${
              showWorkflowTracker
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <GitCommit className="h-3.5 w-3.5 text-teal-600" />
            <span>{showWorkflowTracker ? 'Hide Lifecycle Pipeline' : '12-Step Lifecycle'}</span>
          </button>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MRN, Name, Procedure..."
              className="pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-sm w-52 sm:w-60"
            />
          </div>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-semibold focus:outline-none shadow-sm"
          >
            <option value="ALL">All Wards</option>
            <option value="Ward 4B">Ward 4B (Pre-Op Demo)</option>
            <option value="Ward 3A">Ward 3A (General)</option>
            <option value="Ward 5C">Ward 5C (Orthopedics)</option>
            <option value="Ward 5A">Ward 5A (Cardio)</option>
          </select>
        </div>
      </motion.div>

      {/* Live 12-Step Surgical Workflow Tracker */}
      {showWorkflowTracker && (
        <motion.div variants={itemVariants}>
          <SurgicalWorkflowTracker selectedPatient={selectedPatient} onRefreshData={loadPatients} />
        </motion.div>
      )}

      {/* Main Table */}
      <motion.div
        variants={itemVariants}
        className="glass-card shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Patient MRN & Name</th>
                <th className="py-3.5 px-4">Ward & Bed</th>
                <th className="py-3.5 px-4">Primary Diagnosis / Procedure</th>
                <th className="py-3.5 px-4">Consent Status</th>
                <th className="py-3.5 px-4">Pre-Op Readiness</th>
                <th className="py-3.5 px-4">Patient Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPatients.map((p) => {
                const isTargetDemo = p.id === 'pat_1024';
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`hover:bg-slate-50 transition-all cursor-pointer group ${
                      isTargetDemo ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-teal-700 font-bold">{p.mrn}</span>
                        {isTargetDemo && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                            DEMO TARGET
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                        <span>{p.name}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition" />
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{p.wardId}</span>
                      <p className="text-[10px] text-slate-500">{p.bedNumber}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <span>{p.primaryDiagnosis}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.readiness?.consentStatus || 'MISSING'} />
                    </td>

                    <td className="py-3.5 px-4">
                      {p.readiness?.isReady ? (
                        <StatusBadge status="6/6 READY" tone="success" />
                      ) : (
                        <StatusBadge
                          status={`${p.readiness?.completedItemsCount || 0}/6 NOT READY`}
                          tone="danger"
                        />
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPatient(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-200"
                      >
                        Checklist
                      </button>

                      {p.status === 'READY_FOR_OT' && (
                        <button
                          onClick={() => handleStartTransfer(p)}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm"
                        >
                          Start Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Selected Patient Checklist Modal */}
      <DetailModal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
        subtitle={selectedPatient ? `${selectedPatient.wardId} • ${selectedPatient.primaryDiagnosis}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedPatient && selectedPatient.readiness && (
          <div className="space-y-4">
            <ReadinessChecklist
              readiness={selectedPatient.readiness}
              onUpdateItem={handleUpdateChecklistItem}
              onConsentChange={handleConsentChange}
            />

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
              >
                Close
              </button>
              {selectedPatient.readiness.isReady && selectedPatient.status !== 'IN_TRANSFER' && (
                <button
                  onClick={() => {
                    handleStartTransfer(selectedPatient);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Initiate Patient Transfer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </DetailModal>

      {/* Add Patient Modal */}
      <DetailModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        title="Register New Inpatient Record"
        subtitle="Create a new patient record & initialize pre-op readiness checklist"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4 text-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">MRN (Medical Record Number) *</label>
              <input
                type="text"
                required
                value={addPatientForm.mrn}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, mrn: e.target.value })}
                placeholder="e.g. MRN-1099"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={addPatientForm.name}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, name: e.target.value })}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={addPatientForm.age}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, age: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={addPatientForm.gender}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 bg-white"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Ward</label>
              <select
                value={addPatientForm.wardId}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, wardId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 bg-white"
              >
                <option value="Ward 4B">Ward 4B (Pre-Op Inpatient)</option>
                <option value="Ward 3A">Ward 3A (General Surgery)</option>
                <option value="Ward 5C">Ward 5C (Orthopedics)</option>
                <option value="Ward 5A">Ward 5A (Cardiovascular)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bed Number</label>
              <input
                type="text"
                value={addPatientForm.bedNumber}
                onChange={(e) => setAddPatientForm({ ...addPatientForm, bedNumber: e.target.value })}
                placeholder="e.g. Bed 405"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Primary Diagnosis / Procedure</label>
            <input
              type="text"
              value={addPatientForm.primaryDiagnosis}
              onChange={(e) => setAddPatientForm({ ...addPatientForm, primaryDiagnosis: e.target.value })}
              placeholder="e.g. Acute Appendicitis / Laparoscopic Appendectomy"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600 bg-white"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddPatientModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition"
            >
              Save & Register Patient
            </button>
          </div>
        </form>
      </DetailModal>
    </motion.div>
  );
};
