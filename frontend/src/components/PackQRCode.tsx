import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface PackQRCodeProps {
  packId: string;        // e.g. "CSSD-021"
  size?: number;         // canvas width/height in px, default 200
  className?: string;
}

/**
 * Renders a real, camera-scannable QR code for a CSSD pack ID.
 * The encoded value is just the plain packId string (e.g. "CSSD-021")
 * so the QRScannerModal can read it directly.
 */
export const PackQRCode: React.FC<PackQRCodeProps> = ({
  packId,
  size = 200,
  className = '',
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
