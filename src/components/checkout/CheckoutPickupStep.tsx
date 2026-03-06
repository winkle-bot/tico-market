import { Check, Clock } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { MarketEvent, PickupLocation } from '@/types';
import { formatSchedule } from './checkout-utils';

interface CheckoutPickupStepProps {
  marketEvents: MarketEvent[];
  pickupLocations: PickupLocation[];
  selectedLocationId: string | null;
  selectedEvent: MarketEvent | undefined;
  scheduledWindow: string;
  setSelectedLocationId: (value: string) => void;
  setScheduledWindow: (value: string) => void;
  onContinue: () => void;
}

export function CheckoutPickupStep({
  marketEvents,
  pickupLocations,
  selectedLocationId,
  selectedEvent,
  scheduledWindow,
  setSelectedLocationId,
  setScheduledWindow,
  onContinue,
}: CheckoutPickupStepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6f83ad] font-medium">{t('checkout.selectPickupLocation', 'Select where you\'ll pick it up:')}</p>

      {marketEvents.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
            {t('checkout.feriaPreorder', 'Feria Pre-Order')}
          </p>
          <p className="mt-1 text-sm font-semibold text-orange-900">
            {selectedEvent
              ? `${t('checkout.reservingFor', 'Reserving for')} ${selectedEvent.name}.`
              : t('checkout.chooseFeriaSlot', 'Choose a feria event below to reserve pickup ahead of time.')}
          </p>
        </div>
      )}

      {marketEvents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('checkout.specialEventsMarkets', 'Special Events / Markets')}</h4>
          <div className="space-y-2">
            {marketEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedLocationId(event.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left min-h-16 ${
                  selectedLocationId === event.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-gray-900">{event.name}</h3>
                  {selectedLocationId === event.id && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-blue-600 font-bold mb-1">{event.date}</p>
                <p className="text-xs text-gray-500">{event.timeWindow}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {pickupLocations.length > 0 && (
        <div>
          {marketEvents.length > 0 && (
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 mt-4">{t('checkout.regularLocations', 'Regular Locations')}</h4>
          )}
          <div className="space-y-2">
            {pickupLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocationId(location.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left min-h-16 ${
                  selectedLocationId === location.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-green-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{location.name}</h3>
                  {selectedLocationId === location.id && <Check className="w-5 h-5 text-green-600" />}
                </div>
                <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatSchedule(location.schedule)}</span>
                </div>
                {location.notes && <p className="text-xs text-amber-600 mt-2">📝 {location.notes}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4">
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {selectedEvent
            ? t('checkout.reservationNote', 'Reservation note (optional)')
            : t('checkout.preferredPickupTime', 'Preferred pickup time (optional)')}
        </label>
        <input
          type="text"
          placeholder={selectedEvent
            ? t('checkout.reservationNotePlaceholder', 'e.g., I can arrive closer to 10:30')
            : t('checkout.pickupTimePlaceholder', 'e.g., Saturday morning')}
          className="tm-input"
          value={scheduledWindow}
          onChange={(e) => setScheduledWindow(e.target.value)}
        />
      </div>

      <button onClick={onContinue} className="w-full tm-btn bg-green-600 text-white hover:bg-green-700 mt-4">
        {selectedEvent
          ? t('checkout.reviewReservation', 'Review Reservation')
          : t('common.continue')}
      </button>
    </div>
  );
}
