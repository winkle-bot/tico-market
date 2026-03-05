'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, ChevronLeft, CheckCircle2, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { withCsrfHeaders } from '@/lib/csrf';
import type { DriverVehicleType } from '@/types';

const VEHICLE_OPTIONS: Array<{ value: DriverVehicleType; label: string; description: string }> = [
  { value: 'motorcycle', label: 'Motorcycle', description: 'Fast delivery for small packages' },
  { value: 'car', label: 'Car', description: 'Medium packages, weather-proof' },
  { value: 'pickup', label: 'Pickup (with bed)', description: 'Large items and furniture' },
];

type Step = 'form' | 'capturing' | 'submitting' | 'success';

export default function DriverApplicationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [vehicleType, setVehicleType] = useState<DriverVehicleType | ''>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) {
      return;
    }

    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Some browsers block autoplay; user can still start playback by interacting with controls.
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!isLoading && user?.name) {
      setFullName(user.name);
    }
  }, [user, isLoading]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('driverApp.cameraNotSupported', 'Camera is not supported in this browser.'));
      return;
    }

    stopCamera();
    setIsCameraStarting(true);
    setStep('capturing');

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      await attachStreamToVideo();
    } catch {
      stopCamera();
      setStep('form');
      setError(t('driverApp.cameraAccessDenied', 'Camera access denied. Please allow camera permissions.'));
    } finally {
      setIsCameraStarting(false);
    }
  }, [attachStreamToVideo, stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraReady) {
      setError(t('driverApp.cameraNotReady', 'Camera is not ready yet. Please wait.'));
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError(t('driverApp.cameraUnavailable', 'Camera feed is unavailable. Please retake your photo.'));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setStep('form');

    stopCamera();
  }, [isCameraReady, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    void startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (step !== 'capturing' || !streamRef.current) {
      return;
    }
    void attachStreamToVideo();
  }, [attachStreamToVideo, step]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !vehicleType || !capturedImage) {
      setError(t('driverApp.fillAllFields', 'Please fill all fields and take your profile photo.'));
      return;
    }

    setStep('submitting');
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/drivers/apply', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        signal: controller.signal,
        body: JSON.stringify({
          fullName: fullName.trim(),
          vehicleType,
          faceImageBase64: capturedImage,
        }),
      });

      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        throw new Error(data.error || 'Application failed');
      }

      setStep('success');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(t('driverApp.timeout', 'Submission timed out. Please try again.'));
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
      setStep('form');
    } finally {
      clearTimeout(timeout);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">{t('common.loading', 'Loading...')}</div>;
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#dce5f7] p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-[#18284a]">{t('driverApp.success', 'You are now a driver with us!')}</h1>
          <p className="text-[#6780b3]">
            {t('driverApp.successDescription', 'Start accepting deliveries right away, or get verified for more opportunities.')}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/drivers/verify" className="tm-btn tm-btn-primary w-full justify-center">
              {t('driverApp.getVerified', 'Get Verified for More Deliveries')}
            </Link>
            <Link href="/drivers" className="tm-btn w-full justify-center border border-[#dce5f7] text-[#334d80] hover:bg-[#f5f8ff]">
              {t('driverApp.browseMarketplace', 'Browse Driver Marketplace')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">{t('driverApp.onboarding', 'Driver Onboarding')}</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">{t('driverApp.title', 'Become a Driver')}</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 max-w-lg mx-auto space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <section className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-4">
          <div>
            <label className="text-sm text-[#334d80] font-semibold">{t('driverApp.fullName', 'Full Name')}</label>
            <input
              type="text"
              className="tm-input mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('driverApp.fullNamePlaceholder', 'Your full name')}
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm text-[#334d80] font-semibold block mb-2">{t('driverApp.vehicleType', 'Vehicle Type')}</label>
            <div className="space-y-2">
              {VEHICLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVehicleType(option.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${vehicleType === option.value
                      ? 'border-[#1f4fbf] bg-[#edf2ff]'
                      : 'border-[#dce5f7] hover:bg-[#f5f8ff]'
                    }`}
                >
                  <Truck className={`w-5 h-5 ${vehicleType === option.value ? 'text-[#1f4fbf]' : 'text-[#6780b3]'}`} />
                  <div>
                    <p className={`font-bold text-sm ${vehicleType === option.value ? 'text-[#1f4fbf]' : 'text-[#18284a]'}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-[#6780b3]">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-4">
          <div>
            <h2 className="text-sm text-[#334d80] font-semibold">{t('driverApp.profilePhoto', 'Profile Photo (Live Capture)')}</h2>
            <p className="text-xs text-[#6780b3] mt-1">
              {t('driverApp.photoNotice', 'This becomes your public profile picture and cannot be changed.')}
            </p>
          </div>

          {step === 'form' && !capturedImage && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[#c5d3ef] hover:border-[#1f4fbf] hover:bg-[#f5f8ff] transition-colors text-[#6780b3] hover:text-[#1f4fbf]"
            >
              <Camera className="w-6 h-6" />
              <span className="font-bold text-sm">{t('driverApp.openCamera', 'Open Camera')}</span>
            </button>
          )}

          {step === 'capturing' && !capturedImage && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setIsCameraReady(true)}
                className="w-full rounded-xl border border-[#dce5f7]"
              />
              <p className="text-xs text-[#6780b3]">
                {isCameraStarting ? t('driverApp.startingCamera', 'Starting camera...') : isCameraReady ? t('driverApp.cameraReady', 'Camera ready.') : t('driverApp.initCamera', 'Initializing camera...')}
              </p>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady}
                className="tm-btn tm-btn-primary w-full justify-center"
              >
                <Camera className="w-4 h-4" /> {t('driverApp.takePhoto', 'Take Photo')}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setStep('form');
                }}
                className="tm-btn w-full justify-center border border-[#dce5f7] text-[#334d80] hover:bg-[#f5f8ff]"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-3">
              <img
                src={capturedImage}
                alt="Captured profile photo"
                className="w-full rounded-xl border border-[#dce5f7]"
              />
              <button
                type="button"
                onClick={retakePhoto}
                className="text-sm font-bold text-[#1f4fbf] hover:underline"
              >
                {t('driverApp.retakePhoto', 'Retake Photo')}
              </button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={step === 'submitting' || !fullName.trim() || !vehicleType || !capturedImage}
          className="tm-btn tm-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 'submitting' ? t('driverApp.submitting', 'Submitting...') : t('driverApp.submit', 'Become a Driver')}
        </button>
      </main>
    </div>
  );
}
