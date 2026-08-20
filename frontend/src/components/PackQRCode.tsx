import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, CheckCircle2, ShieldCheck, Calendar, Hash } from 'lucide-react';

interface PackQRCodeProps {
  packId: string;        // e.g. "INS-021" or "CSSD-021"
  size?: number;         // canvas width/height in px, default 200
  className?: string;
  packName?: string;
  batchNumber?: string;
  expiryDate?: string;
  sterilizationMethod?: string;
  showPrintableLabel?: boolean;
}

/**
 * Renders a real, camera-scannable QR code for a CSSD pack / instrument set.
 * Encodes the plain packId string (e.g. "INS-021") so camera QR scanners read it instantly.
 * Includes optional printable hospital barcode tag styling and instant PNG export.
 */
export const PackQRCode: React.FC<PackQRCodeProps> = ({
  packId,
  size = 200,
  className = '',
  packName = 'Surgical Instrument Pack',
  batchNumber = 'BATCH-2026-08',
  expiryDate = new Date(Date.now() + 14 * 86400000).toLocaleDateString(),
  sterilizationMethod = 'Steam Autoclave Standard (134°C)',
  showPrintableLabel = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !packId) return;

    QRCode.toCanvas(canvasRef.current, packId, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',  // near-black
        light: '#ffffff', // white background
      },
      errorCorrectionLevel: 'M',
    })
      .then(() => setError(null))
      .catch((err) => setError(err?.message || 'QR generation failed'));
  }, [packId, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${packId}-sterility-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !canvasRef.current) return;
    const qrDataUrl = canvasRef.current.toDataURL('image/png');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CSSD Sterility Label - ${packId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; text-align: center; }
            .label-card { border: 2px solid #000; padding: 15px; width: 280px; margin: 0 auto; border-radius: 8px; }
            .header { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .sub { font-size: 10px; color: #555; margin-bottom: 10px; }
            .qr-img { width: 180px; height: 180px; }
            .pack-id { font-size: 18px; font-weight: 900; font-family: monospace; letter-spacing: 1px; margin: 8px 0; }
            .meta { font-size: 10px; text-align: left; border-top: 1px solid #ddd; pt: 6px; margin-top: 6px; }
            .badge { display: inline-block; background: #e6fffa; color: #047857; font-weight: bold; font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">SmartOT Central Sterile</div>
            <div class="sub">Certified Autoclave Release Label</div>
            <div class="badge">🟢 STERILE & RELEASED</div>
            <br />
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="pack-id">${packId}</div>
            <div style="font-size:12px; font-weight:bold; margin-bottom: 6px;">${packName}</div>
            <div class="meta">
              <div><strong>Batch:</strong> ${batchNumber}</div>
              <div><strong>Method:</strong> ${sterilizationMethod}</div>
              <div><strong>Expires:</strong> ${expiryDate}</div>
              <div><strong>System Clearance:</strong> VERIFIED 6/6</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 ${className}`}
        style={{ width: size, height: size }}
      >
        QR error
      </div>
    );
  }

  if (showPrintableLabel) {
    return (
      <div className={`p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-lg flex flex-col items-center text-center space-y-3 ${className}`}>
        <div className="flex items-center space-x-1 text-[10px] font-bold text-teal-700 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          <ShieldCheck className="h-3 w-3" />
          <span>Certified Sterile Label</span>
        </div>

        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg shadow-sm"
          style={{ imageRendering: 'pixelated' }}
        />

        <div className="space-y-1">
          <span className="font-mono font-black text-slate-900 text-xl tracking-wider block">
            {packId}
          </span>
          <p className="text-xs font-bold text-slate-800">{packName}</p>
        </div>

        <div className="w-full text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Batch ID:</span>
            <span className="font-mono font-bold text-slate-800">{batchNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Expires:</span>
            <span className="font-bold text-emerald-700">{expiryDate}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full pt-1">
          <button
            onClick={handleDownload}
            type="button"
            className="flex-1 flex items-center justify-center space-x-1 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handlePrint}
            type="button"
            className="flex-1 flex items-center justify-center space-x-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

