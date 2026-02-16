import Image from 'next/image';
import { ChevronRight, MapPin, Package, Truck } from 'lucide-react';
import { DELIVERY_FEE_DISPLAY } from '@/config/constants';
import { useI18n } from '@/context/I18nContext';
import type { Listing, OrderType } from '@/types';
import { calculateDeliveryFee, formatDeliveryFee } from './checkout-utils';

interface CheckoutMethodStepProps {
  listing: Listing;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  pickupLocationsCount: number;
  marketEventsCount: number;
  onMethodSelect: (method: OrderType) => void;
}

export function CheckoutMethodStep({
  listing,
  pickupAvailable,
  deliveryAvailable,
  pickupLocationsCount,
  marketEventsCount,
  onMethodSelect,
}: CheckoutMethodStepProps) {
  const { t } = useI18n();
  const estimatedFee = formatDeliveryFee(calculateDeliveryFee(null, null));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 p-4 bg-[#f5f8ff] rounded-2xl mb-6 border border-[#dce5f7]">
        <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0 relative">
          {listing.imageUrl ? (
            <Image src={listing.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[#18284a] truncate">{listing.title}</h3>
          <p className="text-blue-600 font-black text-lg">{listing.price}</p>
          <p className="text-xs text-gray-500">{t('checkout.soldBy', 'Sold by')} {listing.owner}</p>
        </div>
      </div>

      <p className="text-sm text-[#6f83ad] font-medium mb-2">{t('checkout.howGet')}</p>

      {deliveryAvailable && (
        <button
          onClick={() => onMethodSelect('delivery')}
          className="w-full p-4 rounded-2xl border-2 border-[#dce5f7] hover:border-blue-500 transition-all flex items-center gap-4 text-left group min-h-16"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#18284a]">{t('checkout.expressDelivery')}</h3>
              <span className="text-blue-600 font-black">{DELIVERY_FEE_DISPLAY}</span>

            </div>
            <p className="text-sm text-[#6f83ad]">{t('checkout.sameDayGam')}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
        </button>
      )}

      {pickupAvailable && (
        <button
          onClick={() => onMethodSelect('pickup')}
          className="w-full p-4 rounded-2xl border-2 border-[#dce5f7] hover:border-green-500 transition-all flex items-center gap-4 text-left group min-h-16"
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#18284a]">{t('checkout.pickup')}</h3>
              <span className="text-green-600 font-black">{t('checkout.free')}</span>
            </div>
            <p className="text-sm text-[#6f83ad]">
              {marketEventsCount > 0 ? `${marketEventsCount} ${t('checkout.events', 'event(s)')}, ` : ''}
              {pickupLocationsCount} {pickupLocationsCount !== 1 ? t('checkout.locationsAvailable', 'locations available') : t('checkout.locationAvailable', 'location available')}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
        </button>
      )}

      {!deliveryAvailable && !pickupAvailable && (
        <div className="text-center py-8 text-gray-500">
          <p className="font-medium">{t('checkout.contactSeller', 'Contact seller to arrange pickup or delivery')}</p>
        </div>
      )}

      {listing.pickupConfig?.pickupOnly && (
        <p className="text-xs text-center text-amber-600 font-medium mt-2">
          {t('checkout.pickupOnly', 'This item is pickup only due to size/weight')}
        </p>
      )}
    </div>
  );
}
