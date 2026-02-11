'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ShieldCheck, Star, Truck, MapPin, DollarSign } from 'lucide-react';
import { withCsrfHeaders } from '@/lib/csrf';

type DriverData = {
  id: string;
  userId: string;
  name: string;
  faceImageUrl?: string;
  vehicleType: string | null;
  capacityDescription?: string;
  specialties: string[];
  serviceRadiusKm: number;
  currentLat?: number;
  currentLng?: number;
  isOnline: boolean;
  liveNow?: boolean;
  isVerified: boolean;
  verificationStatus: string;
  totalDeliveries: number;
  rating: number;
  baseRate?: number;
  createdAt: string;
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  car: 'Car',
  pickup: 'Pickup (with bed)',
  bike: 'Bike',
  walker: 'Walker',
};

export default function DriverProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const updateLiveStatus = async (liveNow: boolean, lat?: number, lng?: number) => {
    const payload: {
      liveNow: boolean;
      isOnline: boolean;
      currentLat?: number;
      currentLng?: number;
    } = {
      liveNow,
      isOnline: liveNow,
    };

    if (lat !== undefined && lng !== undefined) {
      payload.currentLat = lat;
      payload.currentLng = lng;
    }

    const res = await fetch('/api/drivers/me', {
      method: 'PATCH',
      headers: withCsrfHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(data.error || 'Failed to update live status');
    }
  };

  const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => reject(new Error('Unable to get your location')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        setLoading(true);
        const [res, meRes] = await Promise.all([
          fetch(`/api/drivers/${id}`),
          fetch('/api/drivers/me'),
        ]);

        if (!res.ok) throw new Error('Driver not found');

        const payload = await res.json();
        setDriver(payload.data || payload);

        if (meRes.ok) {
          const mePayload = await meRes.json().catch(() => ({} as { data?: { id?: string }; id?: string }));
          const myDriver = mePayload.data ?? mePayload;
          setIsOwner(Boolean(myDriver.id && myDriver.id === id));
        } else {
          setIsOwner(false);
        }
      } catch {
        setError('Could not load driver profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDriver();
  }, [id]);

  const handleToggleLive = async () => {
    if (!driver || !isOwner || liveLoading) return;

    setLiveLoading(true);
    setLiveError(null);

    try {
      if (driver.liveNow) {
        await updateLiveStatus(false);
        setDriver((prev) => (prev ? { ...prev, liveNow: false, isOnline: false } : prev));
        return;
      }

      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      await updateLiveStatus(true, lat, lng);
      setDriver((prev) => (prev ? { ...prev, liveNow: true, isOnline: true, currentLat: lat, currentLng: lng } : prev));
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Unable to update live status');
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    if (!isOwner || !driver?.liveNow) return;

    let cancelled = false;
    const pollLocation = async () => {
      try {
        const position = await getCurrentPosition();
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        await updateLiveStatus(true, lat, lng);
        if (!cancelled) {
          setDriver((prev) => (prev ? { ...prev, currentLat: lat, currentLng: lng, isOnline: true, liveNow: true } : prev));
        }
      } catch {
        if (!cancelled) {
          setLiveError('Location update failed. Check location permissions.');
        }
      }
    };

    void pollLocation();
    const timer = setInterval(() => {
      void pollLocation();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [driver?.liveNow, isOwner]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">
        Loading driver profile...
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[#dce5f7] p-8 text-center space-y-3">
          <p className="text-[#6780b3]">{error || 'Driver not found'}</p>
          <Link href="/drivers" className="tm-btn tm-btn-primary inline-flex">
            Browse Drivers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/drivers" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">Driver Profile</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">{driver.name}</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 max-w-2xl mx-auto space-y-5">
        {/* Profile Hero */}
        <section className="bg-white rounded-2xl border border-[#dce5f7] p-6">
          <div className="flex items-start gap-5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#eaf0ff] flex-shrink-0">
              {driver.faceImageUrl ? (
                <Image
                  src={driver.faceImageUrl}
                  alt={driver.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#3159a8]">
                  {driver.name.split(' ').map((w) => w[0]?.toUpperCase()).join('').slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#18284a]">{driver.name}</h2>
                {driver.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {driver.verificationStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase">
                    Pending Verification
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  driver.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${driver.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {driver.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-[#6780b3] mt-1">
                {driver.vehicleType ? VEHICLE_LABELS[driver.vehicleType] || driver.vehicleType : 'Vehicle not set'}
              </p>
              {driver.capacityDescription && (
                <p className="text-xs text-[#5d739f] mt-2">{driver.capacityDescription}</p>
              )}
              {isOwner && (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleToggleLive}
                    disabled={liveLoading}
                    className={`tm-btn ${driver.liveNow ? 'border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'tm-btn-primary'} disabled:opacity-60`}
                  >
                    {liveLoading ? 'Updating...' : driver.liveNow ? 'Go Offline' : 'Go Live'}
                  </button>
                  {liveError && <p className="text-xs text-red-600">{liveError}</p>}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-4 text-center">
            <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-black text-[#18284a]">{driver.rating.toFixed(1)}</p>
            <p className="text-[11px] text-[#6780b3] font-semibold uppercase">Rating</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-4 text-center">
            <Truck className="w-5 h-5 text-[#1f4fbf] mx-auto mb-1" />
            <p className="text-lg font-black text-[#18284a]">{driver.totalDeliveries}</p>
            <p className="text-[11px] text-[#6780b3] font-semibold uppercase">Deliveries</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-4 text-center">
            <MapPin className="w-5 h-5 text-[#1f4fbf] mx-auto mb-1" />
            <p className="text-lg font-black text-[#18284a]">{driver.serviceRadiusKm} km</p>
            <p className="text-[11px] text-[#6780b3] font-semibold uppercase">Service Area</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#dce5f7] p-4 text-center">
            <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-black text-[#18284a]">
              {driver.baseRate ? `₡${driver.baseRate.toLocaleString()}` : 'Negotiable'}
            </p>
            <p className="text-[11px] text-[#6780b3] font-semibold uppercase">Base Rate</p>
          </div>
        </section>

        {/* Specialties */}
        {driver.specialties.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#dce5f7] p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#335186] mb-3">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {driver.specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-xs font-semibold text-[#2f539e]"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Request Delivery */}
        <section className="bg-white rounded-2xl border border-[#dce5f7] p-5">
          <Link
            href={`/delivery/request?driverId=${driver.id}&mode=manual`}
            className="tm-btn tm-btn-primary w-full justify-center"
          >
            Request Delivery from {driver.name.split(' ')[0]}
          </Link>
        </section>
      </main>
    </div>
  );
}
