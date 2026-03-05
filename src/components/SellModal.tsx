'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  API_ROUTES,
  DEFAULT_LISTING_COORDS,
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
} from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';
import { useListings } from '@/context/ListingsContext';
import { useI18n } from '@/context/I18nContext';
import { SellBasicFields } from './sell/SellBasicFields';
import { SellFulfillmentSection } from './sell/SellFulfillmentSection';
import { SellImageUpload } from './sell/SellImageUpload';
import { SellLocationSection } from './sell/SellLocationSection';
import type { Listing, NewListingForm, MarketEvent } from '@/types';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: (listing: Listing) => void;
  onOpenAuth: () => void;
}

interface SubmitError {
  message: string;
  details?: string;
}

interface Coords {
  lat: number;
  lng: number;
}

const INITIAL_FORM_STATE: NewListingForm = {
  title: '',
  price: '',
  currency: 'CRC',
  category: 'Other',
  description: '',
  images: [],
  condition: 'good',
  itemType: 'physical',
  pickupAvailable: true,
  platformDelivery: true,
  sellerDelivers: false,
  sellerDeliveryFee: '',
  shipping: false,
  pickupLocationIds: [],
  leadTime: '',
  marketEvents: [],
};

export function SellModal({ isOpen, onClose, onListingCreated, onOpenAuth }: SellModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const { addListing } = useListings();
  const { t } = useI18n();

  const [newItem, setNewItem] = useState<NewListingForm>(INITIAL_FORM_STATE);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<MarketEvent>>({
    name: '',
    date: '',
    timeWindow: '',
    wazeLink: '',
  });
  const [showEventForm, setShowEventForm] = useState(false);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (newItem.title.trim().length < 3) {
      nextErrors.title = 'Title must be at least 3 characters';
    }

    const priceValue = newItem.price.replace(/[^0-9]/g, '');
    if (!priceValue || Number.parseInt(priceValue, 10) <= 0) {
      nextErrors.price = 'Enter a valid price';
    }

    if (!newItem.description.trim()) {
      nextErrors.description = 'Description is required';
    }

    if (!newItem.pickupAvailable && !newItem.platformDelivery && !newItem.sellerDelivers && !newItem.shipping) {
      nextErrors.fulfillment = 'Select at least one fulfillment option';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleClose = () => {
    onClose();
    setNewItem(INITIAL_FORM_STATE);
    setCoords(null);
    setLocationName('');
    setSubmitError(null);
    setErrors({});
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationName('Current GPS Location');
        setIsLocating(false);
      },
      (error) => {
        let message = 'Unable to retrieve location.';
        if (error.code === 1) message = 'Location permission denied. Please enable it in your browser settings.';
        else if (error.code === 2) message = 'Location unavailable. Ensure GPS is on.';
        else if (error.code === 3) message = 'Location request timed out.';

        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          message += ' (Note: GPS requires HTTPS on mobile devices)';
        }

        toast.error(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.date) return;

    setNewItem({
      ...newItem,
      marketEvents: [
        ...newItem.marketEvents,
        {
          id: Date.now().toString(),
          name: newEvent.name,
          date: newEvent.date,
          timeWindow: newEvent.timeWindow || '',
          locationName: newEvent.name,
          wazeLink: newEvent.wazeLink,
        },
      ],
    });

    setNewEvent({ name: '', date: '', timeWindow: '', wazeLink: '' });
    setShowEventForm(false);
  };

  const removeEvent = (id: string) => {
    setNewItem({
      ...newItem,
      marketEvents: newItem.marketEvents.filter((event) => event.id !== id),
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!user) {
      handleClose();
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const currencySymbol = newItem.currency === 'USD' ? '$' : '₡';
    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('price', `${currencySymbol}${newItem.price}`);
    formData.append('currency', newItem.currency);
    formData.append('category', newItem.category);
    formData.append('description', newItem.description);
    formData.append('condition', newItem.condition);
    formData.append('itemType', newItem.itemType);
    formData.append(
      'pickupConfig',
      JSON.stringify({
        deliveryAvailable: newItem.platformDelivery,
        pickupAvailable: newItem.pickupAvailable,
        leadTime: newItem.leadTime,
        marketEvents: newItem.marketEvents,
        availableLocationIds: newItem.pickupLocationIds,
      })
    );
    formData.append(
      'fulfillmentOptions',
      JSON.stringify({
        pickup: newItem.pickupAvailable,
        platform_delivery: newItem.platformDelivery,
        seller_delivers: newItem.sellerDelivers,
        delivery_fee: newItem.sellerDelivers && newItem.sellerDeliveryFee
          ? Number.parseInt(newItem.sellerDeliveryFee.replace(/[^0-9]/g, ''), 10) || null
          : null,
        shipping: newItem.shipping,
      })
    );

    formData.append('sellerId', user.id);
    formData.append('owner', user.name || 'User');
    formData.append('rating', '5.0');
    formData.append('listing_kind', 'seller');

    formData.append('lat', String(coords?.lat || DEFAULT_LISTING_COORDS.lat));
    formData.append('lng', String(coords?.lng || DEFAULT_LISTING_COORDS.lng));

    // Upload primary image
    if (newItem.images[0]) {
      formData.append('image', newItem.images[0]);
    }
    // Upload additional images
    newItem.images.slice(1).forEach((img, i) => {
      formData.append(`image_${i + 1}`, img);
    });

    try {
      const res = await fetch(API_ROUTES.LISTINGS, {
        method: 'POST',
        headers: withCsrfHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError({
          message: data.error || 'Failed to create listing',
          details: data.details,
        });
        return;
      }

      const createdListing = data as Listing;
      addListing(createdListing);
      onListingCreated(createdListing);
      toast.success(`Listing created: ${newItem.title}!`);
      handleClose();
    } catch {
      setSubmitError({
        message: 'Network error',
        details: 'Could not connect to server. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create listing">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-[#dce5f7]"
          >
            <div className="p-5 sm:p-6 border-b border-[#dce5f7] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-[#18284a] uppercase tracking-tight">{t('sell.title')}</h2>
              <button
                onClick={handleClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6 text-[#6f83ad]" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 bg-[#fbfcff]">
              {submitError && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
                  <p className="text-sm font-bold text-red-800">{submitError.message}</p>
                  {submitError.details && <p className="text-xs text-red-600 mt-1">{submitError.details}</p>}
                </div>
              )}

              <SellBasicFields form={newItem} errors={errors} setForm={setNewItem} />

              <SellLocationSection
                user={user}
                coords={coords}
                locationName={locationName}
                isLocating={isLocating}
                onGetLocation={handleGetLocation}
                setCoords={setCoords}
                setLocationName={setLocationName}
              />

              <SellFulfillmentSection
                form={newItem}
                errors={errors}
                newEvent={newEvent}
                showEventForm={showEventForm}
                setForm={setNewItem}
                setNewEvent={setNewEvent}
                setShowEventForm={setShowEventForm}
                onAddEvent={handleAddEvent}
                onRemoveEvent={removeEvent}
              />

              <SellImageUpload
                form={newItem}
                setForm={setNewItem}
                onInvalidSize={() => toast.error('Image must be smaller than 2MB')}
              />

              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full tm-btn tm-btn-primary disabled:opacity-70">
                <PlusCircle className="w-5 h-5" /> {isSubmitting ? t('sell.posting') : t('sell.postListing')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
