'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
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

interface DriverMapItem {
  id: string;
  userId?: string;
  name: string;
  currentLat?: number;
  currentLng?: number;
  vehicleType: string | null;
  rating: number;
  isOnline: boolean;
}

interface DriversMapProps {
  drivers: DriverMapItem[];
}

interface LiveDriverSnapshot {
  id: string;
  userId: string;
  currentLat?: number;
  currentLng?: number;
  isOnline: boolean;
}

export function DriversMap({ drivers }: DriversMapProps) {
  const [liveDrivers, setLiveDrivers] = useState<DriverMapItem[]>(drivers);

  useEffect(() => {
    setLiveDrivers(drivers);
  }, [drivers]);

  useEffect(() => {
    const source = new EventSource('/api/drivers/live?online=true');

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          drivers?: LiveDriverSnapshot[];
        };

        if (!payload.drivers || (payload.type !== 'connected' && payload.type !== 'drivers_snapshot')) {
          return;
        }

        setLiveDrivers((previous) => {
          const byId = new Map(previous.map((driver) => [driver.id, driver]));

          payload.drivers?.forEach((liveDriver) => {
            const target = byId.get(liveDriver.id)
              || Array.from(byId.values()).find((entry) => entry.userId === liveDriver.userId);
            if (!target) {
              return;
            }
            byId.set(target.id, {
              ...target,
              currentLat: liveDriver.currentLat,
              currentLng: liveDriver.currentLng,
              isOnline: liveDriver.isOnline,
            });
          });

          return Array.from(byId.values());
        });
      } catch {
        // Ignore malformed event payloads.
      }
    };

    source.addEventListener('message', handleMessage);

    return () => {
      source.removeEventListener('message', handleMessage);
      source.close();
    };
  }, []);

  const visibleDrivers = useMemo(
    () => liveDrivers.filter((driver) => driver.currentLat !== undefined && driver.currentLng !== undefined),
    [liveDrivers]
  );

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-[#dce5f7] sm:h-[380px]">
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
                  <p className="text-xs capitalize text-[#6780b3]">{driver.vehicleType || 'Vehicle not set'}</p>
                  <p className="text-xs text-[#6780b3]">Rating {driver.rating.toFixed(1)} / 5</p>
                  <p className={`mt-1 text-xs font-bold ${driver.isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
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
