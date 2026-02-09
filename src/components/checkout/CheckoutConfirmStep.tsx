import { MapPin, Truck } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { Listing, MarketEvent, OrderType, PickupLocation } from '@/types';
import type { DriverOption } from './checkout-utils';

interface CheckoutConfirmStepProps {
  listing: Listing;
  method: OrderType | null;
  selectedEvent: MarketEvent | undefined;
  selectedLocation: PickupLocation | undefined;
  scheduledWindow: string;
  deliveryAddress: string;
  deliveryMode: 'express' | 'scheduled';
  selectedDriver: DriverOption | null;
  notes: string;
  isSubmitting: boolean;
  subtotalDisplay: string;
  deliveryFeeDisplay: string;
  ivaDisplay: string;
  totalDisplay: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}

export function CheckoutConfirmStep({
  listing,
  method,
  selectedEvent,
  selectedLocation,
  scheduledWindow,
  deliveryAddress,
  deliveryMode,
  selectedDriver,
  notes,
  isSubmitting,
  subtotalDisplay,
  deliveryFeeDisplay,
  ivaDisplay,
  totalDisplay,
  onNotesChange,
  onSubmit,
}: CheckoutConfirmStepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="bg-[#f5f8ff] rounded-2xl p-4 space-y-3 border border-[#dce5f7]">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Item</span>
          <span className="font-bold text-gray-900">{listing.title}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">{t('checkout.subtotal')}</span>
          <span className="font-bold text-gray-900">{subtotalDisplay}</span>
        </div>
        {method === 'delivery' && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">{t('checkout.deliveryFee')}</span>
            <span className="font-bold text-gray-900">{deliveryFeeDisplay}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">{t('checkout.iva')}</span>
          <span className="font-bold text-gray-900">{ivaDisplay}</span>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="text-sm font-black text-gray-700">{t('checkout.total')}</span>
          <span className="font-black text-gray-900">{totalDisplay}</span>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="text-sm font-bold text-gray-700">Method</span>
          <span className="font-bold text-gray-900 flex items-center gap-1">
            {method === 'pickup' ? (
              <>
                <MapPin className="w-4 h-4 text-green-600" /> {t('checkout.pickup')}
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 text-blue-600" /> Delivery
              </>
            )}
          </span>
        </div>
      </div>

      <div className="bg-[#f5f8ff] rounded-2xl p-4 border border-[#dce5f7]">
        {method === 'pickup' && (
          <>
            {selectedEvent ? (
              <>
                <h4 className="font-bold text-gray-900 mb-1">{selectedEvent.name}</h4>
                <p className="text-sm text-blue-600 font-bold">{selectedEvent.date}</p>
                <p className="text-sm text-gray-500">{selectedEvent.timeWindow}</p>
              </>
            ) : selectedLocation ? (
              <>
                <h4 className="font-bold text-gray-900 mb-1">{selectedLocation.name}</h4>
                <p className="text-sm text-gray-600">{selectedLocation.address}</p>
                {scheduledWindow && <p className="text-sm text-blue-600 mt-2">Preferred: {scheduledWindow}</p>}
              </>
            ) : null}
          </>
        )}
        {method === 'delivery' && (
          <>
            <h4 className="font-bold text-gray-900 mb-1">Deliver to:</h4>
            <p className="text-sm text-gray-600">{deliveryAddress}</p>
            <p className="text-sm text-blue-600 mt-2">
              {deliveryMode === 'express' ? 'Mode: Express now' : `Mode: Scheduled (${scheduledWindow})`}
            </p>
            {selectedDriver && (
              <p className="text-sm text-blue-600 mt-2">
                Driver: {selectedDriver.name} • ETA ~{selectedDriver.etaMinutes} min
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {t('checkout.noteSeller')}
        </label>
        <textarea
          placeholder="Any special instructions..."
          rows={2}
          className="tm-input resize-none"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className={`w-full tm-btn font-black ${
          method === 'pickup'
            ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
            : 'tm-btn-primary disabled:opacity-70'
        } text-white`}
      >
        {isSubmitting ? t('checkout.placingOrder') : t('checkout.confirm')}
      </button>

      <p className="text-xs text-center text-gray-400">The seller will be notified and will confirm your order</p>
    </div>
  );
}
