import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { QRScannerModal } from '../components/QRScannerModal';
import { PackQRCode } from '../components/PackQRCode';
import { CSSDPack, CSSDPackStatus } from '../../../shared/src/types';
import {
  PackageCheck,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  ArrowUpRight,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailModal } from '../components/ui/DetailModal';
import { containerVariants, itemVariants } from '../components/ui/motion-variants';

export const CSSDPage: React.FC = () => {
  const [packs, setPacks] = useState<CSSDPack[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPackForQR, setSelectedPackForQR] = useState<CSSDPack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const loadPacks = async () => {
    try {
      const data = await api.getCSSDPacks();
      setPacks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const handleTransitionPack = async (e: React.MouseEvent, packId: string, targetStatus: CSSDPackStatus) => {
    e.stopPropagation();
    try {
      await api.transitionCSSDPack(packId, { targetStatus });
      loadPacks();
    } catch (err: any) {
      alert(`Lifecycle transition failed: ${err.message}`);
    }
  };

  const filteredPacks = packs.filter((p) => {
    const matchesSearch =
      p.packId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.packType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sterilizationBatch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
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
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
              <PackageCheck className="h-5 w-5" />
            </div>
            <span>Central Sterile Services Department (CSSD)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sterile pack lifecycle management, batch traceability, and QR-based instrument verification
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition self-start sm:self-auto"
        >
          <QrCode className="h-4 w-4" />
          <span>Launch QR Scanner / Verifier</span>
        </button>
      </motion.div>

      {/* Filter & Search Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Pack ID (e.g. CSSD-021), Type..."
            className="pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 w-64 shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-semibold focus:outline-none shadow-sm"
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="STORED">STORED</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_USE">IN_USE</option>
          <option value="STERILIZING">STERILIZING</option>
          <option value="REPROCESSING">REPROCESSING</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </motion.div>

      {/* Packs Grid / Table */}
      <motion.div
        variants={itemVariants}
        className="glass-card shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pack Identifier</th>
                <th className="py-3.5 px-4">Instrument Set Type</th>
                <th className="py-3.5 px-4">Sterilization Batch</th>
                <th className="py-3.5 px-4">Sterility Validity</th>
                <th className="py-3.5 px-4">Current Location</th>
                <th className="py-3.5 px-4">Lifecycle State</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPacks.map((pack) => {
                const isTargetDemo = pack.packId === 'CSSD-021';
                const isExpired = pack.currentStatus === 'EXPIRED' || pack.sterilityStatus === 'EXPIRED';

                return (
                  <tr
                    key={pack.id}
                    onClick={() => setSelectedPackForQR(pack)}
                    className={`hover:bg-slate-50 transition cursor-pointer group ${
                      isTargetDemo ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-teal-700">{pack.packId}</span>
                        {isTargetDemo && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                            DEMO TARGET
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 flex items-center space-x-1">
                        <span>{pack.packType}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition" />
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {pack.sterilizationBatch}
                    </td>

                    <td className="py-3.5 px-4">
                      {isExpired ? (
                        <StatusBadge status={`Expired (${new Date(pack.expiresAt).toLocaleDateString()})`} tone="danger" />
                      ) : (
                        <StatusBadge status={`Valid (${new Date(pack.expiresAt).toLocaleDateString()})`} tone="success" />
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {pack.currentLocation}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={pack.currentStatus} pulse={pack.currentStatus === 'STERILIZING'} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPackForQR(pack)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-teal-800 border border-slate-200 text-xs font-semibold transition"
                      >
                        QR Pass
                      </button>

                      {pack.currentStatus === 'STORED' && (
                        <button
                          onClick={(e) => handleTransitionPack(e, pack.packId, 'AVAILABLE')}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-sm"
                        >
                          Mark Available
                        </button>
                      )}

                      {pack.currentStatus === 'RETURNED' && (
                        <button
                          onClick={(e) => handleTransitionPack(e, pack.packId, 'REPROCESSING')}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-sm"
                        >
                          Reprocess
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

      {/* QR Code Inspection Modal — REAL scannable QR code */}
      <DetailModal
        isOpen={!!selectedPackForQR}
        onClose={() => setSelectedPackForQR(null)}
        title={selectedPackForQR ? `Sterile Tray QR Pass: ${selectedPackForQR.packId}` : ''}
        subtitle={selectedPackForQR ? selectedPackForQR.packType : ''}
        maxWidth="max-w-sm"
      >
        {selectedPackForQR && (
          <div className="flex flex-col items-center space-y-4 text-center">
            {/* Real QR Code */}
            <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-md flex flex-col items-center space-y-3">
              <PackQRCode
                packId={selectedPackForQR.packId}
                size={200}
                className="shadow-sm"
              />
              <span className="font-mono font-extrabold text-slate-900 text-lg tracking-wider">
                {selectedPackForQR.packId}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Scan with SmartOT camera scanner to verify</p>
            </div>

            {/* Action buttons: Download QR + Copy ID */}
            <div className="flex items-center space-x-2 w-full">
              <button
                onClick={() => {
                  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
                  if (canvas) {
                    const link = document.createElement('a');
                    link.download = `${selectedPackForQR.packId}-qr.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  }
                }}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download QR</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedPackForQR.packId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Pack metadata */}
            <div className="text-xs text-slate-700 space-y-1.5 w-full text-left p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p><span className="text-slate-500 font-medium">Pack Type:</span> <span className="font-bold text-slate-900">{selectedPackForQR.packType}</span></p>
              <p><span className="text-slate-500 font-medium">Sterilization Batch:</span> <span className="font-mono text-slate-900 font-bold">{selectedPackForQR.sterilizationBatch}</span></p>
              <p><span className="text-slate-500 font-medium">Sterilized at:</span> <span className="font-semibold">{new Date(selectedPackForQR.sterilizedAt).toLocaleString()}</span></p>
              <p><span className="text-slate-500 font-medium">Valid until:</span> <span className={`font-bold ${
                selectedPackForQR.sterilityStatus === 'EXPIRED' ? 'text-rose-700' : 'text-emerald-700'
              }`}>{new Date(selectedPackForQR.expiresAt).toLocaleDateString()}</span></p>
              <p><span className="text-slate-500 font-medium">Current Location:</span> <span className="text-slate-800 font-semibold">{selectedPackForQR.currentLocation}</span></p>
              <p><span className="text-slate-500 font-medium">Status:</span> <span className="font-bold">{selectedPackForQR.currentStatus}</span></p>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Interactive QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          loadPacks();
        }}
        onPackAssigned={() => {
          loadPacks();
        }}
      />
    </motion.div>
  );
};
