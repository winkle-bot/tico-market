import { Check, MapPin } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { User } from '@/types';

interface Coords {
  lat: number;
  lng: number;
}

interface SellLocationSectionProps {
  user: User | null;
  coords: Coords | null;
  locationName: string;
  isLocating: boolean;
  onGetLocation: () => void;
  setCoords: (coords: Coords) => void;
  setLocationName: (name: string) => void;
}

export function SellLocationSection({
  user,
  coords,
  locationName,
  isLocating,
  onGetLocation,
  setCoords,
  setLocationName,
}: SellLocationSectionProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
        {t('sell.itemLocation')}
      </label>
      <div className="flex gap-2">
        <button
          onClick={onGetLocation}
          disabled={isLocating}
          className={`flex-1 p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-bold ${
            coords && locationName === 'Current GPS Location'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'bg-[#f5f8ff] border-[#dce5f7] text-[#465f91] hover:border-[#a7bae0]'
          }`}
        >
          {isLocating ? (
            <span className="animate-pulse">{t('sell.locating')}</span>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              {coords && locationName === 'Current GPS Location'
                ? t('sell.usingGps')
                : t('sell.useCurrentLocation')}
            </>
          )}
        </button>

        {user?.pickupLocations && user.pickupLocations.length > 0 && (
          <select
            className="tm-input flex-1 min-h-[48px]"
            onChange={(e) => {
              const locationId = e.target.value;
              if (!locationId) return;
              const savedLocation = user.pickupLocations?.find((location) => location.id === locationId);
              if (savedLocation) {
                setCoords({ lat: savedLocation.coords[0], lng: savedLocation.coords[1] });
                setLocationName(savedLocation.name);
              }
            }}
            value={
              locationName !== 'Current GPS Location'
                ? user.pickupLocations.find((location) => location.name === locationName)?.id || ''
                : ''
            }
          >
            <option value="">Select Saved Location...</option>
            {user.pickupLocations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        )}
      </div>
      {coords && (
        <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" /> Location set: {locationName}
        </p>
      )}
    </div>
  );
}
