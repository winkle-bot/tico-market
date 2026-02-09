'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from '@/config/constants';

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

interface DriversMapProps {
  drivers: Array<{
    id: string;
    name: string;
    currentLat?: number;
    currentLng?: number;
    vehicleType: string | null;
    rating: number;
    isOnline: boolean;
  }>;
}

export function DriversMap({ drivers }: DriversMapProps) {
  const visibleDrivers = useMemo(
    () => drivers.filter((driver) => driver.currentLat !== undefined && driver.currentLng !== undefined),
    [drivers]
  );

  return (
    <div className="h-[320px] sm:h-[380px] w-full rounded-2xl overflow-hidden border border-[#dce5f7]">
      {typeof window !== 'undefined' && (
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleDrivers.map((driver) => (
            <Marker key={driver.id} position={[driver.currentLat as number, driver.currentLng as number]}>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <p className="font-bold text-[#18284a]">{driver.name}</p>
                  <p className="text-xs text-[#6780b3] capitalize">{driver.vehicleType || 'Vehicle not set'}</p>
                  <p className="text-xs text-[#6780b3]">Rating {driver.rating.toFixed(1)} / 5</p>
                  <p className={`text-xs font-bold mt-1 ${driver.isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {driver.isOnline ? 'Online now' : 'Offline'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
