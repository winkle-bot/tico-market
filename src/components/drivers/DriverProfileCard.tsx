import type { VehicleType } from '@/types';

interface DriverProfileCardProps {
  driver: {
    id: string;
    name: string;
    rating: number;
    vehicleType: VehicleType | null;
    specialties: string[];
    isOnline: boolean;
    totalDeliveries: number;
    distanceKm?: number;
    capacityDescription?: string;
  };
  onRequest?: (driverId: string) => void;
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motorcycle',
  car: 'Car',
  pickup: 'Pickup',
  bike: 'Bike',
  walker: 'Walker',
};

export function DriverProfileCard({ driver, onRequest }: DriverProfileCardProps) {
  const initials = driver.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((entry) => entry[0]?.toUpperCase())
    .join('') || 'D';

  return (
    <article className="rounded-2xl border border-[#dce5f7] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-[#eaf0ff] text-[#3159a8] font-black flex items-center justify-center">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-[#18284a] font-bold truncate">{driver.name}</h3>
            <p className="text-xs text-[#6780b3] font-medium">
              {driver.vehicleType ? VEHICLE_LABELS[driver.vehicleType] : 'Vehicle not set'}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
            driver.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${driver.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
            aria-hidden="true"
          />
          {driver.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-[#f5f8ff] px-3 py-2">
          <p className="text-[#6780b3]">Rating</p>
          <p className="font-black text-[#213762]">{driver.rating.toFixed(1)} / 5</p>
        </div>
        <div className="rounded-xl bg-[#f5f8ff] px-3 py-2">
          <p className="text-[#6780b3]">Deliveries</p>
          <p className="font-black text-[#213762]">{driver.totalDeliveries}</p>
        </div>
        <div className="rounded-xl bg-[#f5f8ff] px-3 py-2">
          <p className="text-[#6780b3]">Distance</p>
          <p className="font-black text-[#213762]">
            {driver.distanceKm !== undefined ? `${driver.distanceKm.toFixed(1)} km` : 'Unknown'}
          </p>
        </div>
      </div>

      {driver.capacityDescription && (
        <p className="mt-3 text-xs text-[#5d739f]">{driver.capacityDescription}</p>
      )}

      {driver.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {driver.specialties.map((specialty) => (
            <span
              key={`${driver.id}-${specialty}`}
              className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#2f539e]"
            >
              {specialty}
            </span>
          ))}
        </div>
      )}

      {onRequest && (
        <button
          type="button"
          onClick={() => onRequest(driver.id)}
          className="mt-4 w-full tm-btn tm-btn-primary"
          disabled={!driver.isOnline}
        >
          {driver.isOnline ? 'Request Delivery' : 'Driver Offline'}
        </button>
      )}
    </article>
  );
}
