'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Radio, Truck } from 'lucide-react';
import { MAP_CENTER } from '@/config/constants';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

type LiveDriverSnapshot = {
  id: string;
  userId: string;
  currentLat?: number;
  currentLng?: number;
  isOnline: boolean;
  updatedAt: string;
};

interface OrderDriverLiveMapProps {
  driverUserId: string;
  driverName?: string;
  dateLocale: string;
  pickupCoords?: [number, number] | null;
}

function isValidLatLng(value: [number, number] | null | undefined): value is [number, number] {
  if (!value) return false;
  const [lat, lng] = value;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function distanceKm(from: [number, number], to: [number, number]): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to[0] - from[0]);
  const dLng = toRadians(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(dLng / 2) ** 2;

  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function OrderDriverLiveMap({ driverUserId, driverName, dateLocale, pickupCoords }: OrderDriverLiveMapProps) {
  const [snapshot, setSnapshot] = useState<LiveDriverSnapshot | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/drivers/live?online=false');

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          drivers?: LiveDriverSnapshot[];
        };

        if (!payload.drivers || (payload.type !== 'connected' && payload.type !== 'drivers_snapshot')) {
          return;
        }

        const match = payload.drivers.find((driver) => driver.userId === driverUserId) || null;
        setSnapshot(match);
      } catch {
        // Ignore malformed event payloads.
      }
    };

    source.addEventListener('message', handleMessage);

    return () => {
      source.removeEventListener('message', handleMessage);
      source.close();
    };
  }, [driverUserId]);

  const driverCoords = useMemo<[number, number] | null>(() => {
    if (
      snapshot &&
      Number.isFinite(snapshot.currentLat) &&
      Number.isFinite(snapshot.currentLng)
    ) {
      return [Number(snapshot.currentLat), Number(snapshot.currentLng)];
    }

    return null;
  }, [snapshot]);

  const hasPickupCoords = isValidLatLng(pickupCoords);
  const hasDriverCoords = isValidLatLng(driverCoords);
  const mapCenter = hasDriverCoords
    ? driverCoords
    : hasPickupCoords
      ? pickupCoords
      : MAP_CENTER;
  const liveDistance =
    hasDriverCoords && hasPickupCoords
      ? distanceKm(pickupCoords, driverCoords)
      : null;

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
          <Radio className="w-3.5 h-3.5" /> Live Driver Tracker
        </p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
            snapshot?.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${snapshot?.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
            aria-hidden="true"
          />
          {snapshot?.isOnline ? 'Live' : 'Waiting'}
        </span>
      </div>

      <p className="mt-2 text-xs text-emerald-800">
        {driverName || 'Driver'} updates here automatically every few seconds while the order is active.
      </p>

      {typeof window !== 'undefined' && (
        <div className="mt-3 h-56 overflow-hidden rounded-xl border border-emerald-100 bg-white">
          <MapContainer
            center={mapCenter}
            zoom={hasPickupCoords && hasDriverCoords ? 13 : 15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasPickupCoords && (
              <Marker position={pickupCoords}>
                <Popup>
                  <div className="min-w-[150px]">
                    <p className="font-bold text-slate-900">Pickup point</p>
                    <p className="text-xs text-slate-600">Seller handoff location</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {hasDriverCoords && (
              <Marker position={driverCoords}>
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-bold text-slate-900">{driverName || 'Driver'}</p>
                    <p className="text-xs text-slate-600">Live position from driver check-in</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

      <div className="mt-3 grid gap-2 text-xs text-emerald-800 sm:grid-cols-3">
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="font-black uppercase tracking-widest text-[10px] text-emerald-600">Current Position</p>
          <p className="mt-1">
            {hasDriverCoords ? `${driverCoords[0].toFixed(4)}, ${driverCoords[1].toFixed(4)}` : 'Waiting for driver location'}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="font-black uppercase tracking-widest text-[10px] text-emerald-600">Distance To Pickup</p>
          <p className="mt-1">
            {liveDistance !== null ? `${liveDistance.toFixed(1)} km` : 'Need pickup and driver coordinates'}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="font-black uppercase tracking-widest text-[10px] text-emerald-600">Last Ping</p>
          <p className="mt-1">
            {snapshot?.updatedAt
              ? new Date(snapshot.updatedAt).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' })
              : 'No live ping yet'}
          </p>
        </div>
      </div>

      {hasDriverCoords && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${driverCoords[0]},${driverCoords[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open live driver location in Google Maps
        </a>
      )}

      {!hasDriverCoords && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Truck className="w-3.5 h-3.5" />
          Tracking starts once the driver shares a live position.
        </div>
      )}
    </div>
  );
}
