import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import { QRVerificationResult, CSSDPack } from '../../../shared/src/types';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  Camera,
  CameraOff,
  Keyboard,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPackAssigned?: (pack: CSSDPack, otCode: string) => void;
  defaultOTCode?: string;
  defaultRequiredPackType?: string;
}

type ScanMode = 'camera' | 'manual';

const QR_READER_ID = 'html5qr-reader-smartot';

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onPackAssigned,
  defaultOTCode = 'OT-03',
  defaultRequiredPackType = 'Appendectomy Set',
}) => {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [packIdInput, setPackIdInput] = useState('CSSD-021');
  const [targetOT, setTargetOT] = useState(defaultOTCode);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QRVerificationResult | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);

  const html5QrRef = useRef<Html5Qrcode | null>(null);

  // ── Start camera scanner ────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setResult(null);
    setScannedRaw(null);
    setIsAssigned(false);

    try {
      // Clean up any previous instance
      if (html5QrRef.current) {
        try { await html5QrRef.current.stop(); } catch {}
        html5QrRef.current = null;
      }

      const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // rear camera preferred
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText) => {
          // QR code detected — stop camera and verify
          handleQRDetected(decodedText);
        },
        () => {
          // scan frame error — silently ignore
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings, or use Manual Entry below.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraError('No camera found on this device. Use Manual Entry below.');
      } else {
        setCameraError(`Camera error: ${msg}. Try Manual Entry below.`);
      }
      setCameraActive(false);
    }
  }, []);

  // ── Stop camera scanner ─────────────────────────────────────────────
  const stopCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      html5QrRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // ── When modal opens in camera mode, start camera ───────────────────
  useEffect(() => {
    if (isOpen && mode === 'camera') {
      // Small delay to let DOM render the reader div first
      const t = setTimeout(() => startCamera(), 250);
      return () => clearTimeout(t);
    }
    return () => { stopCamera(); };
  }, [isOpen, mode]);

  // ── Clean up on modal close ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setResult(null);
      setScannedRaw(null);
      setIsAssigned(false);
      setCameraError(null);
    }
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  // ── Handle a decoded QR value ───────────────────────────────────────
  const handleQRDetected = async (rawText: string) => {
    await stopCamera();

    // Extract pack ID — QR may encode just "CSSD-021" or a JSON/URL with it
    let packId = rawText.trim();

    // If it looks like JSON, try to parse packId from it
    if (packId.startsWith('{')) {
      try {
        const parsed = JSON.parse(packId);
        packId = parsed.packId || parsed.id || parsed.pack_id || packId;
      } catch {}
    }

    // If it's a URL, extract the last path segment or query param
    if (packId.startsWith('http')) {
      try {
        const url = new URL(packId);
        packId = url.searchParams.get('packId') || url.pathname.split('/').pop() || packId;
      } catch {}
    }

    setScannedRaw(rawText);
    setPackIdInput(packId);
    await verifyPack(packId);
  };

  // ── Verify pack via backend ─────────────────────────────────────────
  const verifyPack = async (id: string) => {
    const packId = id.trim();
    if (!packId) return;

    setIsLoading(true);
    setResult(null);
    setIsAssigned(false);

    try {
      const res = await api.verifyCSSDQR({
        packId,
        targetOT,
        requiredPackType: defaultRequiredPackType,
      });
      setResult(res);
    } catch (err: any) {
      setResult({
        valid: false,
        packId,
        status: 'BLOCKED',
        message: err.message || 'Scan verification failed',
        reasons: ['Backend verification error — check network connection'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Assign verified pack to OT ──────────────────────────────────────
  const handleAssignToOT = async () => {
    if (!result?.pack) return;
    setIsLoading(true);
    try {
      await api.transitionCSSDPack(result.pack.packId, {
        targetStatus: 'ASSIGNED',
        assignedOtId: targetOT,
        currentLocation: `${targetOT} Sterile Anteroom`,
      });
      setIsAssigned(true);
      if (onPackAssigned) onPackAssigned(result.pack, targetOT);
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchMode = async (newMode: ScanMode) => {
    if (newMode === 'camera') {
      setResult(null);
      setScannedRaw(null);
      setIsAssigned(false);
    } else {
      await stopCamera();
    }
    setMode(newMode);
  };

  const handleRescan = async () => {
    setResult(null);
    setScannedRaw(null);
    setIsAssigned(false);
    setIsLoading(false);
    if (mode === 'camera') {
      await startCamera();
    }
  };

  const quickDemoPacks = [
    { id: 'CSSD-021', type: 'Appendectomy Set', desc: 'Valid & Certified Sterile (Demo Target)' },
    { id: 'CSSD-099', type: 'Appendectomy Set', desc: 'Expired Sterile Barrier (Will Block)' },
    { id: 'CSSD-044', type: 'Laparotomy Major Set', desc: 'In Autoclave (Will Block)' },
    { id: 'CSSD-001', type: 'Laparotomy Major Set', desc: 'Valid Major Set' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl relative flex flex-col text-slate-800 max-h-[92vh] overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 heading-serif">Sterile Instrument QR Scanner</h3>
              <p className="text-xs text-slate-500">Point camera at pack QR code or enter ID manually</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Target OT selector ──────────────────────────────────── */}
          <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-slate-600 shrink-0">Assign to OT:</label>
            <select
              value={targetOT}
              onChange={(e) => setTargetOT(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-teal-700 focus:outline-none focus:border-teal-500"
            >
              {['OT-01', 'OT-02', 'OT-03', 'OT-04'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* ── Mode toggle ─────────────────────────────────────────── */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleSwitchMode('camera')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'camera' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Camera Scan</span>
            </button>
            <button
              onClick={() => handleSwitchMode('manual')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'manual' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>

          {/* ── CAMERA MODE ─────────────────────────────────────────── */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {/* Camera error */}
              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-start space-x-2">
                  <CameraOff className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Camera preview — html5-qrcode mounts here */}
              {!result && !cameraError && (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                  {/* html5-qrcode renders its own <video> inside this div */}
                  <div id={QR_READER_ID} className="w-full" style={{ minHeight: 280 }} />

                  {/* Scan frame overlay */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-52 h-52">
                        {/* Corner brackets */}
                        {[
                          'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                          'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                          'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                          'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                        ].map((cls, i) => (
                          <div key={i} className={`absolute w-8 h-8 border-teal-400 ${cls}`} />
                        ))}
                        {/* Animated scan line */}
                        <div className="absolute left-2 right-2 h-0.5 bg-teal-400/80 animate-[scanLine_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
                      </div>
                    </div>
                  )}

                  {/* Loading spinner while camera initializes */}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                      <div className="text-center space-y-2 text-white">
                        <Camera className="h-8 w-8 mx-auto animate-pulse" />
                        <p className="text-xs font-medium">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scanning hint */}
              {cameraActive && !result && (
                <p className="text-center text-xs text-slate-500 font-medium">
                  Point your camera at the QR code on the sterile pack
                </p>
              )}

              {/* Scanned raw text debug */}
              {scannedRaw && (
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-500 truncate">
                  Raw scan: <span className="text-teal-700 font-bold">{scannedRaw}</span>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL MODE ─────────────────────────────────────────── */}
          {mode === 'manual' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Pack ID (e.g. CSSD-021)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={packIdInput}
                    onChange={(e) => setPackIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyPack(packIdInput)}
                    placeholder="Type CSSD-021..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600 shadow-inner"
                  />
                  <button
                    onClick={() => verifyPack(packIdInput)}
                    disabled={isLoading || !packIdInput.trim()}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition disabled:opacity-50 shadow-sm"
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Quick demo packs */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quick Demo Packs:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickDemoPacks.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPackIdInput(p.id); verifyPack(p.id); }}
                      className="text-left p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-400 hover:bg-white transition text-xs shadow-sm"
                    >
                      <span className="font-mono font-bold text-teal-700">{p.id}</span>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{p.type}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Loading spinner ──────────────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-center space-x-2 py-4 text-teal-700 text-sm font-bold">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Verifying pack with SmartOT database...</span>
            </div>
          )}

          {/* ── Verification Result ──────────────────────────────────── */}
          {result && !isLoading && (
            <div className={`p-4 rounded-xl border flex flex-col space-y-3 shadow-sm ${
              result.status === 'VERIFIED'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {/* Result header */}
              <div className="flex items-center space-x-2">
                {result.status === 'VERIFIED'
                  ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  : <XCircle className="h-6 w-6 text-rose-600 shrink-0" />}
                <div>
                  <h4 className="font-bold text-sm">{result.message}</h4>
                  <p className="text-xs opacity-90">{result.suggestedAction}</p>
                </div>
              </div>

              {/* Reasons */}
              <div className="text-xs space-y-1 bg-white/80 p-2.5 rounded-lg border border-current/20">
                {result.reasons.map((r, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              {/* Pack details when verified */}
              {result.pack && result.status === 'VERIFIED' && (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1 bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                  <div><span className="text-slate-500">Pack ID:</span> <span className="font-mono font-bold text-teal-700">{result.pack.packId}</span></div>
                  <div><span className="text-slate-500">Type:</span> <span className="font-semibold">{result.pack.packType}</span></div>
                  <div><span className="text-slate-500">Batch:</span> <span className="font-semibold">{result.pack.sterilizationBatch}</span></div>
                  <div><span className="text-slate-500">Expires:</span> <span className="font-semibold">{new Date(result.pack.expiresAt).toLocaleDateString()}</span></div>
                </div>
              )}

              {/* Assign / Rescan buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-current/20 gap-2">
                <button
                  onClick={handleRescan}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Scan Again</span>
                </button>

                {result.status === 'VERIFIED' && (
                  <button
                    onClick={handleAssignToOT}
                    disabled={isLoading || isAssigned}
                    className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-sm"
                  >
                    {isAssigned ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Assigned to {targetOT} ✓</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Assign to {targetOT}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Scan line animation */}
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-60px); opacity: 0.4; }
          50%  { opacity: 1; }
          100% { transform: translateY(60px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};
