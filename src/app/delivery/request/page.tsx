'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Radio, User, Megaphone, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { withCsrfHeaders } from '@/lib/csrf';
import { enqueueJsonMutation, isOfflineMutationError } from '@/lib/offline-queue';
import type { DeliveryRequestType, DriverProfile } from '@/types';

type RequestMode = DeliveryRequestType;

const MODE_CONFIG: Array<{ id: RequestMode; labelKey: string; labelFallback: string; icon: typeof Radio; description: string }> = [
  { id: 'auto', labelKey: 'delivery.autoAssign', labelFallback: 'Auto-Assign', icon: Radio, description: 'System picks the best available verified driver' },
  { id: 'manual', labelKey: 'delivery.selectDriver', labelFallback: 'Select Driver', icon: User, description: 'Choose a specific driver for your delivery' },
  { id: 'broadcast', labelKey: 'delivery.broadcast', labelFallback: 'Broadcast', icon: Megaphone, description: 'All nearby drivers can bid on your request' },
];

function DeliveryRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const { t } = useI18n();

  const preselectedDriverId = searchParams.get('driverId');
  const preselectedMode = searchParams.get('mode') as RequestMode | null;

  const [mode, setMode] = useState<RequestMode>(preselectedMode || 'broadcast');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(preselectedDriverId || '');
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Form fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (mode === 'manual' || mode === 'auto') {
      fetchDrivers();
    }
  }, [mode]);

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const res = await fetch('/api/drivers?online=false');
      if (!res.ok) throw new Error('Failed to load');
      const payload = await res.json();
      setDrivers(payload.data || []);
    } catch {
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    if (!vehicleFilter) return drivers;
    return drivers.filter((d) => d.vehicleType === vehicleFilter);
  }, [drivers, vehicleFilter]);

  const handleSubmit = useCallback(async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim() || !itemDescription.trim()) {
      setError(t('delivery.fillRequired', 'Please fill in pickup address, dropoff address, and item description.'));
      return;
    }

    if (mode === 'manual' && !selectedDriverId) {
      setError(t('delivery.selectDriverRequired', 'Please select a driver for manual request.'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        requestType: mode,
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
        itemDescription: itemDescription.trim(),
        budgetAmount: offeredPrice ? parseInt(offeredPrice, 10) : undefined,
        offeredPrice: offeredPrice ? parseInt(offeredPrice, 10) : undefined,
      };

      if (mode === 'manual' && selectedDriverId) {
        body.targetDriverId = selectedDriverId;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueJsonMutation({
          url: '/api/delivery-requests',
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccess('Delivery request queued for sync. It will send when your connection returns.');
        setPickupAddress('');
        setDropoffAddress('');
        setItemDescription('');
        setOfferedPrice('');
        setSelectedDriverId('');
        return;
      }

      const res = await fetch('/api/delivery-requests', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setSuccess('Delivery request created!');
      setTimeout(() => {
        router.push(`/delivery/manage/${data.id}`);
      }, 1500);
    } catch (err) {
      if (isOfflineMutationError(err)) {
        const body: Record<string, unknown> = {
          requestType: mode,
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
          itemDescription: itemDescription.trim(),
          budgetAmount: offeredPrice ? parseInt(offeredPrice, 10) : undefined,
          offeredPrice: offeredPrice ? parseInt(offeredPrice, 10) : undefined,
        };
        if (mode === 'manual' && selectedDriverId) {
          body.targetDriverId = selectedDriverId;
        }

        await enqueueJsonMutation({
          url: '/api/delivery-requests',
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccess('Delivery request queued for sync. It will send when your connection returns.');
        setPickupAddress('');
        setDropoffAddress('');
        setItemDescription('');
        setOfferedPrice('');
        setSelectedDriverId('');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }, [mode, pickupAddress, dropoffAddress, itemDescription, offeredPrice, selectedDriverId, router, t]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <>
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/delivery" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">New Request</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">Request Delivery</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 max-w-2xl mx-auto space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">{success}</div>}

        {/* Mode Selection */}
        <section className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Delivery Mode</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODE_CONFIG.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-colors text-left ${
                    mode === m.id ? 'border-[#1f4fbf] bg-[#edf2ff]' : 'border-[#dce5f7] hover:bg-[#f5f8ff]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${mode === m.id ? 'text-[#1f4fbf]' : 'text-[#6780b3]'}`} />
                  <span className={`font-bold text-sm ${mode === m.id ? 'text-[#1f4fbf]' : 'text-[#18284a]'}`}>
                    {t(m.labelKey, m.labelFallback)}
                  </span>
                  <span className="text-[11px] text-[#6780b3]">{m.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Driver Selection (manual mode) */}
        {mode === 'manual' && (
          <section className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">{t('delivery.selectDriver', 'Select Driver')}</h2>
            <select
              className="tm-input"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="">All Vehicle Types</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
              <option value="pickup">Pickup</option>
            </select>
            {loadingDrivers ? (
              <p className="text-sm text-[#6780b3]">Loading drivers...</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredDrivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDriverId(d.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      selectedDriverId === d.id ? 'border-[#1f4fbf] bg-[#edf2ff]' : 'border-[#dce5f7] hover:bg-[#f5f8ff]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#eaf0ff] flex items-center justify-center text-sm font-black text-[#3159a8]">
                      {d.name.split(' ').map((w) => w[0]?.toUpperCase()).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#18284a] truncate">{d.name}</span>
                        {d.isVerified && <span className="text-[10px] font-black text-emerald-600">VERIFIED</span>}
                        <span className={`text-[10px] font-black ${d.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {d.isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
                        </span>
                      </div>
                      <p className="text-xs text-[#6780b3]">
                        {d.vehicleType || t('delivery.noVehicle', 'No vehicle')} &bull; {d.rating.toFixed(1)} rating &bull; {d.baseRate ? `₡${d.baseRate.toLocaleString()}` : t('delivery.negotiable', 'Negotiable')}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredDrivers.length === 0 && (
                  <p className="text-sm text-[#6780b3] text-center py-4">No drivers found.</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Delivery Details */}
        <section className="bg-white rounded-2xl border border-[#dce5f7] p-5 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#335186]">Delivery Details</h2>

          <div>
            <label className="text-sm text-[#334d80] font-semibold">Pickup Address</label>
            <input
              type="text"
              className="tm-input mt-1"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Where to pick up the item"
              maxLength={300}
            />
          </div>

          <div>
            <label className="text-sm text-[#334d80] font-semibold">Dropoff Address</label>
            <input
              type="text"
              className="tm-input mt-1"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="Where to deliver"
              maxLength={300}
            />
          </div>

          <div>
            <label className="text-sm text-[#334d80] font-semibold">What are you sending?</label>
            <textarea
              className="tm-input mt-1 min-h-[80px]"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Describe the item(s)"
              maxLength={1000}
            />
          </div>

          <div>
            <label className="text-sm text-[#334d80] font-semibold">
              {mode === 'broadcast' ? t('delivery.budgetAmount', 'Your Budget (₡)') : t('delivery.offeredPrice', 'Offered Price (₡)')}
            </label>
            <input
              type="number"
              className="tm-input mt-1"
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(e.target.value)}
              placeholder="e.g. 2500"
              min={0}
            />
            {mode === 'broadcast' && (
              <p className="text-xs text-[#6780b3] mt-1">Drivers can accept or counter with a different price.</p>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="tm-btn tm-btn-primary w-full justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? t('delivery.sendingRequest', 'Sending Request...') : t('delivery.sendRequest', 'Send Delivery Request')}
        </button>
      </main>
    </>
  );
}

export default function DeliveryRequestPage() {
  return (
    <div className="min-h-screen bg-[#f5f8ff] pb-8">
      <Suspense fallback={<div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Loading&hellip;</div>}>
        <DeliveryRequestContent />
      </Suspense>
    </div>
  );
}
