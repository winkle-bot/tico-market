'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronLeft, X } from 'lucide-react';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
  API_ROUTES,
} from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import { COSTA_RICA_IVA_RATE, formatColonFromCents, parseColonPriceToCents } from '@/lib/payments';
import { useI18n } from '@/context/I18nContext';
import type {
  CheckoutPaymentMethod,
  Listing,
  CheckoutStep,
  OrderType,
  SinpeConfig,
  User,
} from '@/types';
import { CheckoutConfirmStep } from './checkout/CheckoutConfirmStep';
import { CheckoutDeliveryStep } from './checkout/CheckoutDeliveryStep';
import { CheckoutMethodStep } from './checkout/CheckoutMethodStep';
import { CheckoutPickupStep } from './checkout/CheckoutPickupStep';
import { calculateDeliveryFee, estimateEtaMinutes, formatDeliveryFee, getDistanceKm, parseDeliveryFee, type DriverOption } from './checkout/checkout-utils';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  seller: User | null;
  currentUser: { id: string; name: string } | null;
  drivers: Listing[];
  onSuccess: (orderId: string) => void;
  onAuthRequired: () => void;
  preferredMethod?: OrderType | null;
}

export function CheckoutModal({
  isOpen,
  onClose,
  listing,
  seller,
  currentUser,
  drivers,
  onSuccess,
  onAuthRequired,
  preferredMethod,
}: CheckoutModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<CheckoutStep>('method');
  const [method, setMethod] = useState<OrderType | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'express' | 'scheduled'>('express');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [scheduledWindow, setScheduledWindow] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('card');
  const [sinpeConfig, setSinpeConfig] = useState<SinpeConfig | null>(null);
  const [sinpeReference, setSinpeReference] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const startMethod = preferredMethod ?? null;
      setStep(startMethod === 'delivery' ? 'delivery-details' : startMethod === 'pickup' ? 'pickup-details' : 'method');
      setMethod(startMethod);
      setDeliveryMode('express');
      setSelectedLocationId(null);
      setScheduledWindow('');
      setDeliveryAddress('');
      setSelectedDriverId(null);
      setNotes('');
      setPaymentMethod('card');
      setSinpeReference('');
      setSenderPhone('');
      setError(null);
    }
  }, [isOpen, preferredMethod]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSinpeConfig = async () => {
      try {
        const res = await fetch('/api/sinpe-config');
        if (!res.ok) {
          setSinpeConfig(null);
          return;
        }
        const payload = await res.json();
        setSinpeConfig(payload?.data || null);
      } catch {
        setSinpeConfig(null);
      }
    };

    void fetchSinpeConfig();
  }, [isOpen]);

  const pickupLocations = seller?.pickupLocations || [];
  const marketEvents = listing?.pickupConfig?.marketEvents || [];
  const deliveryAvailable = seller?.acceptsDelivery !== false &&
    (listing?.pickupConfig?.deliveryAvailable !== false) &&
    !listing?.pickupConfig?.pickupOnly;

  const pickupAvailable = (listing?.pickupConfig?.pickupAvailable !== false) &&
    (pickupLocations.length > 0 || marketEvents.length > 0);

  const selectedLocation = pickupLocations.find((location) => location.id === selectedLocationId);
  const selectedEvent = marketEvents.find((event) => event.id === selectedLocationId);

  const driverOptions = useMemo<DriverOption[]>(() => {
    if (!Array.isArray(drivers) || !Array.isArray(listing?.location) || listing.location.length !== 2) {
      return [];
    }

    return drivers
      .map((driver) => {
        const distanceKm = getDistanceKm(listing.location, driver.location);
        const etaMinutes = estimateEtaMinutes(distanceKm);
        return {
          id: driver.sellerId,
          listingId: driver.id,
          name: driver.owner,
          rating: driver.rating,
          verified: Boolean(driver.verified),
          distanceKm,
          etaMinutes,
          availabilityLabel: etaMinutes <= 20 ? 'Disponible ahora' : `Listo en ~${etaMinutes} min`,
        };
      })
      .sort((a, b) => {
        const aScore = a.distanceKm - a.rating * 0.35;
        const bScore = b.distanceKm - b.rating * 0.35;
        return aScore - bScore;
      })
      .slice(0, 6);
  }, [drivers, listing?.location]);

  const selectedDriver = driverOptions.find((driver) => driver.id === selectedDriverId) || null;

  useEffect(() => {
    if (!isOpen || method !== 'delivery' || driverOptions.length === 0 || selectedDriverId) {
      return;
    }
    if (deliveryMode === 'express') {
      setSelectedDriverId(driverOptions[0].id);
    }
  }, [deliveryMode, driverOptions, isOpen, method, selectedDriverId]);

  const deliveryFeeValue = useMemo(() => {
    if (method !== 'delivery') return 0;
    if (selectedDriver) {
      return calculateDeliveryFee(
        listing?.location as [number, number] | undefined,
        // Approximate: use driver distance to compute fee
        listing?.location
          ? [listing.location[0] + (selectedDriver.distanceKm / 111), listing.location[1]]
          : undefined,
      );
    }
    // No driver selected yet — use base fee
    return calculateDeliveryFee(null, null);
  }, [method, selectedDriver, listing?.location]);

  const deliveryFeeDisplay = formatDeliveryFee(deliveryFeeValue);

  const subtotalCents = useMemo(() => {
    if (!listing) return 0;
    const listingAmount = parseColonPriceToCents(listing.price);
    return listingAmount + deliveryFeeValue * 100;
  }, [deliveryFeeValue, listing]);
  const ivaCents = Math.round(subtotalCents * COSTA_RICA_IVA_RATE);
  const totalCents = subtotalCents + ivaCents;

  if (!listing || !seller) return null;

  const handleMethodSelect = (selectedMethod: OrderType) => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }
    setMethod(selectedMethod);
    setStep(selectedMethod === 'pickup' ? 'pickup-details' : 'delivery-details');
  };

  const handleBack = () => {
    if (step === 'pickup-details' || step === 'delivery-details') {
      setStep('method');
      return;
    }

    if (step === 'confirm') {
      setStep(method === 'pickup' ? 'pickup-details' : 'delivery-details');
    }
  };

  const handleContinue = () => {
    setError(null);

    if (step === 'pickup-details') {
      if (!selectedLocationId) {
        setError('Please select a pickup location');
        return;
      }
      setStep('confirm');
      return;
    }

    if (step === 'delivery-details') {
      if (!deliveryAddress.trim()) {
        setError('Please enter a delivery address');
        return;
      }
      if (deliveryMode === 'express' && !selectedDriverId && driverOptions.length > 0) {
        setError('Please choose an express driver');
        return;
      }
      if (deliveryMode === 'scheduled' && !scheduledWindow.trim()) {
        setError('Please choose a preferred delivery window');
        return;
      }
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser || !listing) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const deliveryFee = deliveryFeeValue;
      const expressEta = selectedDriver?.etaMinutes ?? 35;
      const orderData: Record<string, unknown> = {
        listingId: listing.id,
        listingSnapshot: {
          id: listing.id,
          sellerId: listing.sellerId,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          category: listing.category,
          location: listing.location,
          rating: listing.rating,
          type: listing.type,
          owner: listing.owner,
          imageUrl: listing.imageUrl,
          verified: listing.verified,
          pickupConfig: listing.pickupConfig,
        },
        sellerId: listing.sellerId,
        sellerName: listing.owner,
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        type: method,
        notes: notes.trim() || undefined,
      };

      const listingSnapshot = orderData.listingSnapshot as Record<string, unknown>;
      listingSnapshot.paymentMeta = {
        method: paymentMethod,
      };

      if (method === 'pickup') {
        orderData.pickupLocationId = selectedLocationId;
        if (selectedLocation) {
          orderData.pickupLocation = selectedLocation;
        } else if (selectedEvent) {
          orderData.pickupLocation = {
            id: selectedEvent.id,
            name: selectedEvent.name,
            address: selectedEvent.locationName,
            coords: selectedEvent.coords || [0, 0],
            schedule: {},
            notes: `Event Date: ${selectedEvent.date} ${selectedEvent.timeWindow}`,
          };
        }
        orderData.scheduledWindow = scheduledWindow || undefined;
      } else {
        orderData.deliveryAddress = deliveryAddress;
        orderData.deliveryFee = deliveryFee;
        if (selectedDriverId && selectedDriver) {
          orderData.driverId = selectedDriver.id;
          orderData.driverName = selectedDriver.name;
        }
        orderData.scheduledWindow = deliveryMode === 'scheduled'
          ? scheduledWindow
          : `Express ETA ~${expressEta} min`;

        listingSnapshot.deliveryMeta = {
          mode: deliveryMode,
          phase: 'awaiting_confirmation',
          estimatedEtaMinutes: expressEta,
          estimatedDistanceKm: selectedDriver?.distanceKm,
          driverLocationLabel: selectedDriver?.availabilityLabel ?? 'Buscando repartidor',
          updates: [
            {
              id: `u-${Date.now()}`,
              byRole: 'system',
              message: selectedDriver
                ? `Express assigned to ${selectedDriver.name}.`
                : 'Order created. Finding available express driver.',
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }

      if (paymentMethod === 'sinpe_movil') {
        if (!sinpeConfig?.isEnabled) {
          throw new Error('SINPE Movil is currently unavailable');
        }
        if (!sinpeReference.trim()) {
          throw new Error('Please enter a SINPE transfer reference');
        }

        listingSnapshot.paymentMeta = {
          method: paymentMethod,
          status: 'pending_manual_confirmation',
          sinpeReference: sinpeReference.trim(),
          senderPhone: senderPhone.trim() || undefined,
          sinpePhone: sinpeConfig.phoneNumber,
          sinpeAccountHolder: sinpeConfig.accountHolder,
        };

        orderData.notes = [
          notes.trim(),
          `SINPE ref: ${sinpeReference.trim()}`,
          senderPhone.trim() ? `Sender phone: ${senderPhone.trim()}` : null,
        ].filter(Boolean).join(' | ');
      }

      if (paymentMethod === 'cash') {
        listingSnapshot.paymentMeta = {
          method: 'cash',
          status: 'pending_cash_payment',
        };

        orderData.notes = [
          notes.trim(),
          'Payment: Cash on ' + (method === 'delivery' ? 'delivery' : 'pickup'),
        ].filter(Boolean).join(' | ');
      }

      const res = await fetch(API_ROUTES.ORDERS, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const order = await res.json();

      // Cash and SINPE orders don't need Stripe checkout
      if (paymentMethod === 'sinpe_movil' || paymentMethod === 'cash') {
        onSuccess(order.id);
        return;
      }

      const checkoutRes = await fetch(API_ROUTES.CHECKOUT, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!checkoutRes.ok) {
        const checkoutErr = await checkoutRes.json();
        throw new Error(checkoutErr.error || 'Failed to initialize payment');
      }

      const checkout = await checkoutRes.json();
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }

      onSuccess(order.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Checkout">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-[#dce5f7]"
          >
            <div className="p-5 sm:p-6 border-b border-[#dce5f7] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {step !== 'method' && (
                  <button
                    onClick={handleBack}
                    className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors -ml-2"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#6f83ad]" />
                  </button>
                )}
                <h2 className="text-xl font-black text-[#18284a] uppercase tracking-tight">
                  {step === 'method' && t('checkout.getItem')}
                  {step === 'pickup-details' && t('checkout.choosePickup')}
                  {step === 'delivery-details' && t('checkout.deliveryDetails')}
                  {step === 'confirm' && t('checkout.confirmOrder')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6 text-[#6f83ad]" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#fbfcff]">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {step === 'method' && (
                <CheckoutMethodStep
                  listing={listing}
                  pickupAvailable={pickupAvailable}
                  deliveryAvailable={deliveryAvailable}
                  pickupLocationsCount={pickupLocations.length}
                  marketEventsCount={marketEvents.length}
                  onMethodSelect={handleMethodSelect}
                />
              )}

              {step === 'pickup-details' && (
                <CheckoutPickupStep
                  marketEvents={marketEvents}
                  pickupLocations={pickupLocations}
                  selectedLocationId={selectedLocationId}
                  scheduledWindow={scheduledWindow}
                  setSelectedLocationId={setSelectedLocationId}
                  setScheduledWindow={setScheduledWindow}
                  onContinue={handleContinue}
                />
              )}

              {step === 'delivery-details' && (
                <CheckoutDeliveryStep
                  deliveryMode={deliveryMode}
                  deliveryAddress={deliveryAddress}
                  scheduledWindow={scheduledWindow}
                  driverOptions={driverOptions}
                  selectedDriverId={selectedDriverId}
                  setDeliveryMode={setDeliveryMode}
                  setDeliveryAddress={setDeliveryAddress}
                  setScheduledWindow={setScheduledWindow}
                  setSelectedDriverId={setSelectedDriverId}
                  onContinue={handleContinue}
                />
              )}

              {step === 'confirm' && (
                <CheckoutConfirmStep
                  listing={listing}
                  method={method}
                  selectedEvent={selectedEvent}
                  selectedLocation={selectedLocation}
                  scheduledWindow={scheduledWindow}
                  deliveryAddress={deliveryAddress}
                  deliveryMode={deliveryMode}
                  selectedDriver={selectedDriver}
                  notes={notes}
                  isSubmitting={isSubmitting}
                  subtotalDisplay={formatColonFromCents(subtotalCents)}
                  deliveryFeeDisplay={deliveryFeeDisplay}
                  ivaDisplay={formatColonFromCents(ivaCents)}
                  totalDisplay={formatColonFromCents(totalCents)}
                  paymentMethod={paymentMethod}
                  sinpeConfig={sinpeConfig}
                  sinpeReference={sinpeReference}
                  senderPhone={senderPhone}
                  onNotesChange={setNotes}
                  onPaymentMethodChange={setPaymentMethod}
                  onSinpeReferenceChange={setSinpeReference}
                  onSenderPhoneChange={setSenderPhone}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
