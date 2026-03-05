'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Upload, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { withCsrfHeaders } from '@/lib/csrf';

type VerificationState = 'loading' | 'not-driver' | 'upload' | 'pending' | 'approved' | 'rejected';

export default function DriverVerificationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<VerificationState>('loading');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDriverStatus = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/drivers/me', { signal: controller.signal });
      if (res.status === 404) {
        setState('not-driver');
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as { error?: string }));
        if (payload.error) {
          setError(payload.error);
        }
        setState('not-driver');
        return;
      }
      const payload = await res.json().catch(() => ({} as { data?: { id?: string; verificationStatus?: string }; id?: string; verificationStatus?: string }));
      const myDriver = payload.data ?? payload;

      switch (myDriver.verificationStatus) {
        case 'pending':
          setState('pending');
          break;
        case 'approved':
          if (myDriver.id) {
            router.replace(`/drivers/${myDriver.id}`);
            return;
          }
          setState('approved');
          break;
        case 'rejected':
          setState('rejected');
          break;
        default:
          setState('upload');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Unable to load verification status right now. Please try again.');
      }
      setState('not-driver');
    } finally {
      clearTimeout(timeout);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }
    if (!isLoading && user) {
      void checkDriverStatus();
    }
  }, [checkDriverStatus, user, isLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be less than 5MB');
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setLicenseFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!licenseFile) {
      setError('Please select your license photo');
      return;
    }

    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const formData = new FormData();
      formData.append('licenseImage', licenseFile);

      const res = await fetch('/api/drivers/verify', {
        method: 'POST',
        headers: withCsrfHeaders(),
        signal: controller.signal,
        body: formData,
      });

      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        throw new Error(data.error || 'Verification submission failed');
      }

      setState('pending');
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setPreview(null);
      setLicenseFile(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Submission timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/drivers" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">{t('driverVerify.title', 'Driver Verification')}</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">{t('driverVerify.heading', 'Get Verified')}</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 max-w-lg mx-auto space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {state === 'not-driver' && (
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-6 text-center space-y-4">
            <ShieldCheck className="w-12 h-12 text-[#6780b3] mx-auto" />
            <h2 className="text-lg font-black text-[#18284a]">{t('driverVerify.becomeFirst', 'Become a Driver First')}</h2>
            <p className="text-sm text-[#6780b3]">{t('driverVerify.needRegister', 'You need to register as a driver before you can get verified.')}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setState('loading');
                void checkDriverStatus();
              }}
              className="tm-btn w-full justify-center border border-[#dce5f7] text-[#334d80] hover:bg-[#f5f8ff]"
            >
              {t('driverVerify.retryStatus', 'Retry Status Check')}
            </button>
            <Link href="/drivers/apply" className="tm-btn tm-btn-primary inline-flex">
              {t('driverVerify.becomeDriver', 'Become a Driver')}
            </Link>
          </div>
        )}

        {state === 'upload' && (
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#edf2ff] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#1f4fbf]" />
              </div>
              <div>
                <h2 className="font-bold text-[#18284a]">{t('driverVerify.moreDeliveries', 'Get Verified for More Deliveries')}</h2>
                <p className="text-xs text-[#6780b3]">Verified drivers are prioritized for auto-assigned deliveries.</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-[#334d80] font-semibold block mb-2">License Photo</label>
              <p className="text-xs text-[#6780b3] mb-3">
                Take a clear photo of your driver&apos;s license. This is stored privately and only used for verification.
              </p>

              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="License preview" className="w-full rounded-xl border border-[#dce5f7]" />
                  <button
                    type="button"
                    onClick={() => {
                      if (preview) {
                        URL.revokeObjectURL(preview);
                      }
                      setLicenseFile(null);
                      setPreview(null);
                    }}
                    className="text-sm font-bold text-[#1f4fbf] hover:underline"
                  >
                    Choose Different Photo
                  </button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-[#c5d3ef] hover:border-[#1f4fbf] hover:bg-[#f5f8ff] transition-colors cursor-pointer text-[#6780b3] hover:text-[#1f4fbf]">
                  <Upload className="w-6 h-6" />
                  <span className="font-bold text-sm">Upload License Photo</span>
                  <span className="text-xs">JPEG, PNG, or WebP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !licenseFile}
              className="tm-btn tm-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        )}

        {state === 'pending' && (
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-black text-[#18284a]">Verification Pending</h2>
            <p className="text-sm text-[#6780b3]">
              Your license has been submitted. An admin will review your documents shortly.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black uppercase">
              Pending Verification
            </span>
          </div>
        )}

        {state === 'approved' && (
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-[#18284a]">You are Verified!</h2>
            <p className="text-sm text-[#6780b3]">
              You now have priority for auto-assigned deliveries and a verified badge on your profile.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase">
              Verified Driver
            </span>
          </div>
        )}

        {state === 'rejected' && (
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-black text-[#18284a]">Verification Rejected</h2>
            <p className="text-sm text-[#6780b3]">
              Your verification was not approved. You can resubmit with a clearer license photo.
            </p>
            <button
              type="button"
              onClick={() => setState('upload')}
              className="tm-btn tm-btn-primary inline-flex"
            >
              Resubmit Verification
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="py-16 text-center text-[#6780b3] font-medium">Checking verification status...</div>
        )}
      </main>
    </div>
  );
}
