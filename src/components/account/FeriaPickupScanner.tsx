'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Camera, Loader2, QrCode } from 'lucide-react';

type DetectedCode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedCode[]>;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  return (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

export function FeriaPickupScanner({
  isSubmitting,
  onTokenDetected,
}: {
  isSubmitting: boolean;
  onTokenDetected: (token: string) => void;
}) {
  const handleTokenDetected = useEffectEvent(onTokenDetected);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerSupported, setScannerSupported] = useState(false);

  useEffect(() => {
    setScannerSupported(typeof window !== 'undefined' && Boolean(getBarcodeDetector()));
  }, []);

  useEffect(() => {
    if (!isScannerOpen || !scannerSupported) {
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setIsStarting(true);
      setScannerError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = getBarcodeDetector();
        if (!Detector) {
          return;
        }

        const detector = new Detector({ formats: ['qr_code'] });
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || isSubmitting) {
            return;
          }

          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              handleTokenDetected(value);
            }
          } catch {
            // Keep polling; camera access is already live.
          }
        }, 900);
      } catch {
        setScannerError('Could not access the camera. You can still paste the QR token below.');
      } finally {
        setIsStarting(false);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isScannerOpen, isSubmitting, scannerSupported]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {scannerSupported && (
          <button
            type="button"
            onClick={() => setIsScannerOpen((current) => !current)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Camera className="h-4 w-4" />
            {isScannerOpen ? 'Close Camera Scanner' : 'Open Camera Scanner'}
          </button>
        )}
        <span className="text-xs text-slate-500">Manual token entry works as fallback.</span>
      </div>

      {isScannerOpen && scannerSupported && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
          {isStarting && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-medium text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting camera...
            </div>
          )}
          <video ref={videoRef} muted playsInline className={isStarting ? 'hidden' : 'block h-56 w-full object-cover'} />
        </div>
      )}

      {scannerError && <p className="text-xs text-red-600">{scannerError}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={manualToken}
          onChange={(event) => setManualToken(event.target.value)}
          placeholder="Paste QR token"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={isSubmitting || !manualToken.trim()}
          onClick={() => onTokenDetected(manualToken.trim())}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Verify
        </button>
      </div>
    </div>
  );
}
