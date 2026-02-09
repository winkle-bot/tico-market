import { Check, Zap } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { DriverOption } from './checkout-utils';

interface CheckoutDeliveryStepProps {
  deliveryMode: 'express' | 'scheduled';
  deliveryAddress: string;
  scheduledWindow: string;
  driverOptions: DriverOption[];
  selectedDriverId: string | null;
  setDeliveryMode: (mode: 'express' | 'scheduled') => void;
  setDeliveryAddress: (value: string) => void;
  setScheduledWindow: (value: string) => void;
  setSelectedDriverId: (value: string | null) => void;
  onContinue: () => void;
}

export function CheckoutDeliveryStep({
  deliveryMode,
  deliveryAddress,
  scheduledWindow,
  driverOptions,
  selectedDriverId,
  setDeliveryMode,
  setDeliveryAddress,
  setScheduledWindow,
  setSelectedDriverId,
  onContinue,
}: CheckoutDeliveryStepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDeliveryMode('express')}
          className={`rounded-2xl border-2 px-3 py-3 text-left transition-colors min-h-16 ${
            deliveryMode === 'express' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'
          }`}
        >
          <p className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Fastest
          </p>
          <p className="font-bold text-[#18284a] text-sm">Express Now</p>
        </button>
        <button
          type="button"
          onClick={() => setDeliveryMode('scheduled')}
          className={`rounded-2xl border-2 px-3 py-3 text-left transition-colors min-h-16 ${
            deliveryMode === 'scheduled' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'
          }`}
        >
          <p className="text-xs font-black uppercase tracking-wider text-[#6f83ad]">Flexible</p>
          <p className="font-bold text-[#18284a] text-sm">Schedule Window</p>
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {t('checkout.deliveryAddress')} *
        </label>
        <input
          type="text"
          placeholder="District, landmarks, house/apartment"
          className="tm-input"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
        />
      </div>

      {deliveryMode === 'scheduled' && (
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            {t('checkout.preferredWindow')} *
          </label>
          <input
            type="text"
            placeholder="e.g. Today 6:00-8:00pm"
            className="tm-input"
            value={scheduledWindow}
            onChange={(e) => setScheduledWindow(e.target.value)}
          />
        </div>
      )}

      {deliveryMode === 'express' && driverOptions.length > 0 && (
        <div className="pt-2">
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            Available Express Drivers
          </label>
          <div className="space-y-2">
            {driverOptions.map((driver, index) => (
              <button
                key={driver.listingId}
                onClick={() => setSelectedDriverId(selectedDriverId === driver.id ? null : driver.id)}
                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 min-h-14 ${
                  selectedDriverId === driver.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-blue-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                  {driver.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <span>{driver.name}</span>
                    {index === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase tracking-wider">
                        Best match
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    ⭐ {driver.rating.toFixed(1)} • {driver.distanceKm.toFixed(1)} km • {driver.availabilityLabel}
                  </p>
                </div>
                {selectedDriverId === driver.id && <Check className="w-5 h-5 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onContinue} className="w-full tm-btn tm-btn-primary mt-4">
        {t('common.continue')}
      </button>
    </div>
  );
}
