'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, LocateFixed, Navigation, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { withCsrfHeaders } from '@/lib/csrf';
import { wazeLink } from '@/lib/format';

type DriverVehicleType = 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker';

type DriverMe = {
  id: string;
  vehicleType: DriverVehicleType | null;
  currentLat?: number;
  currentLng?: number;
};

type DeliveryRequestItem = {
  id: string;
  status: string;
  requestType?: 'auto' | 'manual' | 'broadcast';
  targetDriverId?: string | null;
  offeredPrice?: number | null;
  budgetAmount?: number | null;
  pickupAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffAddress: string;
  itemDescription: string;
  estimatedWeightKg?: number | null;
  isFragile?: boolean;
  createdAt: string;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function requiresPickupTruck(itemDescription: string, estimatedWeightKg?: number | null): boolean {
  const bulkyMatcher = /(furniture|sofa|couch|mattress|refrigerator|fridge|appliance|wardrobe|table|bed|washer|stove|silla|mueble|refrigeradora|colch[oó]n|lavadora)/i;
  return Boolean((estimatedWeightKg ?? 0) >= 35 || bulkyMatcher.test(itemDescription));
}

function isCompatibleVehicle(
  vehicleType: DriverVehicleType | null,
  itemDescription: string,
  estimatedWeightKg?: number | null
): boolean {
  if (!vehicleType) return false;
  const weight = estimatedWeightKg ?? 0;
  const needsPickup = requiresPickupTruck(itemDescription, estimatedWeightKg);

  if (needsPickup) return vehicleType === 'pickup';
  if (vehicleType === 'pickup') return true;

  if (vehicleType === 'car') return weight <= 35;
  if (vehicleType === 'motorcycle') return weight <= 8;
  if (vehicleType === 'bike' || vehicleType === 'walker') return weight <= 5;

  return false;
}

export default function DeliveryBrowsePage() {
  const { user, isLoading } = useAuth();

  const [driver, setDriver] = useState<DriverMe | null>(null);
  const [requests, setRequests] = useState<DeliveryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceMin, setPriceMin] = useState('0');
  const [priceMax, setPriceMax] = useState('100000');
  const [distanceMax, setDistanceMax] = useState('25');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [driverRes, requestRes] = await Promise.all([
        fetch('/api/drivers/me'),
        fetch('/api/delivery-requests?status=pending&limit=100'),
      ]);

      if (driverRes.ok) {
        const driverPayload = (await driverRes.json()) as DriverMe;
        setDriver(driverPayload);
      } else {
        setDriver(null);
      }

      if (!requestRes.ok) {
        throw new Error('Failed to load delivery requests');
      }
      const requestPayload = await requestRes.json();
      setRequests((requestPayload.data || []) as DeliveryRequestItem[]);
      setFeedback(null);
    } catch (error) {
      setRequests([]);
      setFeedback(error instanceof Error ? error.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && user) {
      void fetchData();
    }
  }, [fetchData, isLoading, user]);

  const visibleRequests = useMemo(() => {
    const min = Number.parseInt(priceMin, 10) || 0;
    const max = Number.parseInt(priceMax, 10) || Number.MAX_SAFE_INTEGER;
    const maxDistance = Number.parseInt(distanceMax, 10) || Number.MAX_SAFE_INTEGER;

    return requests
      .map((request) => {
        const offer = request.offeredPrice ?? request.budgetAmount ?? 0;
        const dist =
          Number.isFinite(driver?.currentLat) &&
          Number.isFinite(driver?.currentLng) &&
          Number.isFinite(request.pickupLat) &&
          Number.isFinite(request.pickupLng)
            ? distanceKm(
                driver?.currentLat as number,
                driver?.currentLng as number,
                request.pickupLat as number,
                request.pickupLng as number
              )
            : undefined;

        return {
          request,
          offer,
          distance: dist,
          vehicleMatch: isCompatibleVehicle(driver?.vehicleType || null, request.itemDescription, request.estimatedWeightKg),
        };
      })
      .filter((entry) => entry.vehicleMatch)
      .filter((entry) => {
        if (!driver?.id) return true;
        if ((entry.request.requestType === 'manual' || entry.request.requestType === 'auto') && entry.request.targetDriverId) {
          return entry.request.targetDriverId === driver.id;
        }
        return true;
      })
      .filter((entry) => entry.offer >= min && entry.offer <= max)
      .filter((entry) => entry.distance === undefined || entry.distance <= maxDistance)
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return b.offer - a.offer;
      });
  }, [distanceMax, driver?.currentLat, driver?.currentLng, driver?.id, driver?.vehicleType, priceMax, priceMin, requests]);

  const acceptRequest = useCallback(async (requestId: string) => {
    setAcceptingId(requestId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/delivery-requests/${requestId}/accept`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to accept request');

      setFeedback('Request accepted. Delivery assigned to you.');
      setRequests((prev) => prev.filter((item) => item.id !== requestId));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to accept request');
    } finally {
      setAcceptingId(null);
    }
  }, []);

  if (isLoading || (user && loading)) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Loading deliveries...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center text-[#6780b3]">Log in to browse deliveries.</div>;
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-[#f5f8ff]">
        <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
          <div className="tm-shell py-6 flex items-center gap-3">
            <Link href="/delivery" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">Driver Tools</p>
              <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">Browse Deliveries</h1>
            </div>
          </div>
        </header>
        <main className="tm-shell py-8">
          <div className="rounded-2xl border border-[#dce5f7] bg-white p-6 text-center space-y-3">
            <p className="text-[#334d80] font-semibold">You need a driver profile to claim deliveries.</p>
            <Link href="/driver-application" className="tm-btn tm-btn-primary">Become a Driver</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff] pb-8">
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell py-6 flex items-center gap-3">
          <Link href="/delivery" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#7690bd]">Driver Tools</p>
            <h1 className="text-xl font-black text-[#18284a] sm:text-2xl">Browse Deliveries</h1>
          </div>
        </div>
      </header>

      <main className="tm-shell py-6 space-y-4">
        <section className="rounded-2xl border border-[#dce5f7] bg-white p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm font-semibold text-[#334d80]">
              Price min (CRC)
              <input className="tm-input mt-1" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} inputMode="numeric" />
            </label>
            <label className="text-sm font-semibold text-[#334d80]">
              Price max (CRC)
              <input className="tm-input mt-1" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} inputMode="numeric" />
            </label>
            <label className="text-sm font-semibold text-[#334d80]">
              Max distance (km)
              <input className="tm-input mt-1" value={distanceMax} onChange={(e) => setDistanceMax(e.target.value)} inputMode="numeric" />
            </label>
            <div className="flex items-end">
              <button type="button" className="tm-btn tm-btn-muted w-full" onClick={() => void fetchData()}>
                <RefreshCcw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6780b3]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2ff] px-3 py-1.5 font-semibold">
              <Navigation className="w-3.5 h-3.5" /> Vehicle: {driver.vehicleType || 'Not set'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2ff] px-3 py-1.5 font-semibold">
              <LocateFixed className="w-3.5 h-3.5" />
              {Number.isFinite(driver.currentLat) && Number.isFinite(driver.currentLng) ? 'Live location enabled' : 'Distance unavailable (no live location)'}
            </span>
          </div>
        </section>

        {feedback && <p className="text-sm text-[#4d6698]">{feedback}</p>}

        <section className="space-y-3">
          {visibleRequests.length === 0 ? (
            <div className="rounded-2xl border border-[#dce5f7] bg-white p-8 text-center text-[#6780b3]">
              No compatible pending delivery requests right now.
            </div>
          ) : (
            visibleRequests.map(({ request, offer, distance }) => (
              <article key={request.id} className="rounded-2xl border border-[#dce5f7] bg-white p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[#7890bd] font-black">Request #{request.id.slice(0, 8)}</p>
                <p className="text-sm text-[#4d689b]">
                  <span className="font-semibold text-[#223d6b]">Pickup:</span> {request.pickupAddress}
                  {request.pickupLat != null && request.pickupLng != null && (
                    <a href={wazeLink(request.pickupLat, request.pickupLng)} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-bold text-purple-600 hover:underline">
                      Navigate
                    </a>
                  )}
                </p>
                <p className="text-sm text-[#4d689b]"><span className="font-semibold text-[#223d6b]">Dropoff:</span> {request.dropoffAddress}</p>
                <p className="text-sm text-[#4d689b] line-clamp-2"><span className="font-semibold text-[#223d6b]">Item:</span> {request.itemDescription}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 font-semibold text-[#2f539e]">Price: ₡{offer.toLocaleString('es-CR')}</span>
                    <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 font-semibold text-[#2f539e]">
                      {distance === undefined ? 'Distance: N/A' : `Distance: ${distance.toFixed(1)} km`}
                    </span>
                    {requiresPickupTruck(request.itemDescription, request.estimatedWeightKg) && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">Pickup truck recommended</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    disabled={acceptingId === request.id}
                    onClick={() => void acceptRequest(request.id)}
                  >
                    {acceptingId === request.id ? 'Accepting...' : 'Accept'}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
