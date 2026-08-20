import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  Sparkles,
  RotateCcw,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ScenarioRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  onOpenAIConsultant?: () => void;
}

export const ScenarioRunnerModal: React.FC<ScenarioRunnerModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onOpenAIConsultant,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const executeStep = async (stepNum: number) => {
    setIsExecuting(true);
    try {
      if (stepNum === 1) {
        // Step 1: Check initial state
        addLog('Inspecting initial status for Patient Arthur Pendelton (P-1024) in Ward 4B...');
        const patient = await api.getPatientById('pat_1024');
        addLog(`Patient Status: ${patient.status} | Consent: ${patient.readiness?.consentStatus} (5/6 Completed)`);
        addLog('Alert Active: "Missing Surgical Consent: Patient P-1024" blocking OT-03 schedule.');
        setCurrentStep(2);
      } else if (stepNum === 2) {
        // Step 2: Verify Consent
        addLog('Verifying surgical & anesthetic consent in Ward 4B...');
        await api.updatePatientConsent('pat_1024', 'VERIFIED');
        await api.updatePatientReadiness('pat_1024', {
          documentationCompleted: true,
          reportsAvailable: true,
          doctorConfirmed: true,
          preopPrepCompleted: true,
        });
        addLog('Consent verified! Readiness checklist updated to 6/6 (READY FOR OT).');
        addLog('Alert auto-resolved by SmartOT Rule Engine.');
        setCurrentStep(3);
      } else if (stepNum === 3) {
        // Step 3: Scan CSSD-021
        addLog('Scanning sterile instrument set QR code (CSSD-021: Appendectomy Set)...');
        const verification = await api.verifyCSSDQR({
          packId: 'CSSD-021',
          targetOT: 'OT-03',
          requiredPackType: 'Appendectomy Set',
          surgeryId: 'surg_1024',
          patientId: 'pat_1024',
          otId: 'ot_03',
        });
        addLog(`QR Verification Result: ${verification.status} (${verification.message})`);
        addLog('Assigning sterile pack CSSD-021 to Operating Theatre OT-03...');
        await api.transitionCSSDPack('CSSD-021', {
          targetStatus: 'ASSIGNED',
          assignedOtId: 'ot_03',
          assignedSurgeryId: 'surg_1024',
          assignedPatientId: 'pat_1024',
          currentLocation: 'OT-03 Sterile Anteroom',
        });
        addLog('Pack successfully assigned and staged for procedure.');
        setCurrentStep(4);
      } else if (stepNum === 4) {
        // Step 4: Patient Transfer
        addLog('Initiating patient transfer from Pre-Op Ward 4B to OT-03...');
        const trf = await api.startTransfer({
          patientId: 'pat_1024',
          surgeryId: 'surg_1024',
          fromWard: 'Ward 4B',
          toOtId: 'ot_03',
          toOtCode: 'OT-03',
        });
        addLog(`Transfer started (ID: ${trf.id}). Patient in transit.`);
        addLog('Recording patient arrival in OT-03...');
        await api.arrivePatient({
          transferId: trf.id,
          patientId: 'pat_1024',
          otId: 'ot_03',
        });
        addLog('Patient arrived in OT-03. Anesthesia and sterile field prepared (OT_READY).');
        setCurrentStep(5);
      } else if (stepNum === 5) {
        // Step 5: Start & Complete Surgery
        addLog('OT Team starting surgery: "Emergency Appendectomy" (Dr. Martinez)...');
        await api.transitionOTState('ot_03', {
          targetState: 'SURGERY_STARTED',
          surgeryId: 'surg_1024',
        });
        addLog('Surgery IN_PROGRESS. Timestamp recorded in immutable event stream.');
        addLog('Simulating successful surgery completion...');
        await api.transitionOTState('ot_03', {
          targetState: 'SURGERY_COMPLETED',
          surgeryId: 'surg_1024',
        });
        addLog('Surgery completed. Patient transferred to Post-Anesthesia Care Unit (PACU).');
        setCurrentStep(6);
      } else if (stepNum === 6) {
        // Step 6: Turnover Overrun
        addLog('Initiating room turnover and terminal disinfection in OT-03...');
        await api.transitionOTState('ot_03', {
          targetState: 'TURNOVER',
        });
        addLog('Simulating 35-minute turnover delay (Exceeds 25m benchmark by 10 minutes)...');
        await api.transitionOTState('ot_03', {
          targetState: 'DELAYED',
          delayMinutes: 20,
          riskLevel: 'HIGH',
        });
        addLog('Delay detected: System flags turnover delay and creates operational alert.');
        setCurrentStep(7);
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addLog(`Error executing step: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Inspect Missing Consent', desc: 'Observe P-1024 hold' },
    { num: 2, label: 'Verify Consent', desc: 'Readiness reaches 6/6' },
    { num: 3, label: 'Scan CSSD-021 QR', desc: 'Verify & assign pack' },
    { num: 4, label: 'Patient Transfer', desc: 'Ward 4B to OT-03' },
    { num: 5, label: 'Execute Surgery', desc: 'Start & complete case' },
    { num: 6, label: 'Turnover Delay', desc: 'Benchmark overrun' },
    { num: 7, label: 'AI Consultation', desc: 'Explain root causes' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 relative flex flex-col space-y-5 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 heading-serif">
                Scripted End-to-End Workflow Scenario (P-1024)
              </h3>
              <p className="text-xs text-slate-500">
                Step-by-step demonstration of the full CONNECT → TRACK → PREDICT → RECOMMEND cycle
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-7 gap-1.5">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`p-2 rounded-xl border text-center transition ${
                currentStep === s.num
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm font-bold'
                  : currentStep > s.num
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider">Step {s.num}</div>
              <div className="text-[11px] truncate mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Step Controls */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
              Current Action Target:
            </span>
            <p className="text-sm font-bold text-slate-900 heading-serif mt-0.5">
              {currentStep === 1 && '1. Inspect Patient P-1024 with Missing Consent in Ward 4B'}
              {currentStep === 2 && '2. Verify Digital Consent & Mark Readiness 6/6 READY'}
              {currentStep === 3 && '3. Scan CSSD-021 QR & Assign Appendectomy Set to OT-03'}
              {currentStep === 4 && '4. Start Inpatient Ward Transport & Log OT Arrival'}
              {currentStep === 5 && '5. Start & Complete Appendectomy in OT-03'}
              {currentStep === 6 && '6. Start Room Turnover & Simulate 35-Minute Overrun'}
              {currentStep === 7 && '7. Scenario Complete! Open AI Operations Consultant to investigate.'}
            </p>
          </div>

          <div>
            {currentStep < 7 ? (
              <button
                onClick={() => executeStep(currentStep)}
                disabled={isExecuting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                {isExecuting ? (
                  <span>Executing Step {currentStep}...</span>
                ) : (
                  <>
                    <span>Execute Step {currentStep}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAIConsultant) onOpenAIConsultant();
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-md"
              >
                <Sparkles className="h-4 w-4 fill-current" />
                <span>Open AI Operations Consultant</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Execution Console Logs */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 h-44 overflow-y-auto space-y-1 shadow-inner">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Operational Event Stream Log:
          </p>
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">Click "Execute Step 1" to start the scripted scenario sequence...</p>
          ) : (
            logs.map((l, i) => <p key={i} className="text-teal-400">{l}</p>)
          )}
        </div>
      </div>
    </div>
  );
};
