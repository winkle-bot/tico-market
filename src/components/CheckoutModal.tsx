'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Truck,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
  DELIVERY_FEE_DISPLAY,
  API_ROUTES,
} from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import type {
  Listing,
  PickupLocation,
  CheckoutStep,
  OrderType,
  User,
} from '@/types';

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

// Helper to format schedule for display
function formatSchedule(schedule: PickupLocation['schedule']): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const available = days
    .map((day, i) => {
      const times = schedule[day as keyof typeof schedule];
      if (times && times.length > 0) {
        const range = times.map(t => `${t.start}-${t.end}`).join(', ');
        return `${shortDays[i]} ${range}`;
      }
      return null;
    })
    .filter(Boolean);
  
  return available.join(' • ') || 'Contact seller for availability';
}

function getDistanceKm(from: [number, number], to: [number, number]): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to[0] - from[0]);
  const dLng = toRadians(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(12, Math.round(8 + distanceKm * 6));
}

function parseDeliveryFee(display: string): number {
  const value = Number.parseInt(display.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(value) ? value : 2500;
}

interface DriverOption {
  id: string;
  listingId: number;
  name: string;
  rating: number;
  verified: boolean;
  distanceKm: number;
  etaMinutes: number;
  availabilityLabel: string;
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
  const [step, setStep] = useState<CheckoutStep>('method');
  const [method, setMethod] = useState<OrderType | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'express' | 'scheduled'>('express');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [scheduledWindow, setScheduledWindow] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
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
      setError(null);
    }
  }, [isOpen, preferredMethod]);

  const pickupLocations = seller?.pickupLocations || [];
  const marketEvents = listing?.pickupConfig?.marketEvents || [];
  const deliveryAvailable = seller?.acceptsDelivery !== false &&
    (listing?.pickupConfig?.deliveryAvailable !== false) && // check override
    !listing?.pickupConfig?.pickupOnly;
    
  const pickupAvailable = (listing?.pickupConfig?.pickupAvailable !== false) && // check explicit flag
    (pickupLocations.length > 0 || marketEvents.length > 0);

  const selectedLocation = pickupLocations.find(l => l.id === selectedLocationId);
  const selectedEvent = marketEvents.find(e => e.id === selectedLocationId); // Reuse ID for events
  
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

  const selectedDriver = driverOptions.find((d) => d.id === selectedDriverId) || null;

  useEffect(() => {
    if (!isOpen || method !== 'delivery' || driverOptions.length === 0 || selectedDriverId) {
      return;
    }
    if (deliveryMode === 'express') {
      setSelectedDriverId(driverOptions[0].id);
    }
  }, [deliveryMode, driverOptions, isOpen, method, selectedDriverId]);

  if (!listing || !seller) return null;

  const handleMethodSelect = (m: OrderType) => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }
    setMethod(m);
    setStep(m === 'pickup' ? 'pickup-details' : 'delivery-details');
  };

  const handleBack = () => {
    if (step === 'pickup-details' || step === 'delivery-details') {
      setStep('method');
    } else if (step === 'confirm') {
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
    } else if (step === 'delivery-details') {
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
      const deliveryFee = parseDeliveryFee(DELIVERY_FEE_DISPLAY);
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

      if (method === 'pickup') {
        orderData.pickupLocationId = selectedLocationId;
        if (selectedLocation) {
             orderData.pickupLocation = selectedLocation;
        } else if (selectedEvent) {
             // Adapt event to pickup location shape for storage consistency
             orderData.pickupLocation = {
                 id: selectedEvent.id,
                 name: selectedEvent.name,
                 address: selectedEvent.locationName, // Or "Event Location"
                 coords: selectedEvent.coords || [0,0],
                 schedule: {}, // Empty schedule for one-off events
                 notes: `Event Date: ${selectedEvent.date} ${selectedEvent.timeWindow}`
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
        const listingSnapshot = orderData.listingSnapshot as Record<string, unknown>;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-[#dce5f7]"
          >
            {/* Header */}
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
                  {step === 'method' && 'Get This Item'}
                  {step === 'pickup-details' && 'Choose Pickup'}
                  {step === 'delivery-details' && 'Delivery Details'}
                  {step === 'confirm' && 'Confirm Order'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-[#6f83ad]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#fbfcff]">
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Step 1: Choose Method */}
              {step === 'method' && (
                <div className="space-y-4">
                  {/* Listing preview */}
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
                      <p className="text-xs text-gray-500">Sold by {listing.owner}</p>
                    </div>
                  </div>

                  <p className="text-sm text-[#6f83ad] font-medium mb-2">
                    How do you want to get it?
                  </p>

                  {/* Delivery option */}
                  {deliveryAvailable && (
                    <button
                      onClick={() => handleMethodSelect('delivery')}
                      className="w-full p-4 rounded-2xl border-2 border-[#dce5f7] hover:border-blue-500 transition-all flex items-center gap-4 text-left group min-h-16"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[#18284a]">Express Delivery</h3>
                          <span className="text-blue-600 font-black">{DELIVERY_FEE_DISPLAY}</span>
                        </div>
                        <p className="text-sm text-[#6f83ad]">Same-day delivery in GAM</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                    </button>
                  )}

                  {/* Pickup option */}
                  {pickupAvailable && (
                    <button
                      onClick={() => handleMethodSelect('pickup')}
                      className="w-full p-4 rounded-2xl border-2 border-[#dce5f7] hover:border-green-500 transition-all flex items-center gap-4 text-left group min-h-16"
                    >
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[#18284a]">Pickup</h3>
                          <span className="text-green-600 font-black">FREE</span>
                        </div>
                        <p className="text-sm text-[#6f83ad]">
                          {marketEvents.length > 0 ? `${marketEvents.length} event(s), ` : ''}
                          {pickupLocations.length} location{pickupLocations.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
                    </button>
                  )}

                  {/* No options available */}
                  {!deliveryAvailable && !pickupAvailable && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="font-medium">Contact seller to arrange pickup or delivery</p>
                    </div>
                  )}

                  {/* Pickup only notice */}
                  {listing.pickupConfig?.pickupOnly && (
                    <p className="text-xs text-center text-amber-600 font-medium mt-2">
                      This item is pickup only due to size/weight
                    </p>
                  )}
                </div>
              )}

              {/* Step 2a: Pickup Details */}
              {step === 'pickup-details' && (
                <div className="space-y-4">
                  <p className="text-sm text-[#6f83ad] font-medium">
                    Select where you&apos;ll pick it up:
                  </p>

                  {/* Market Events Section */}
                  {marketEvents.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Special Events / Markets</h4>
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
                              {selectedLocationId === event.id && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-blue-600 font-bold mb-1">{event.date}</p>
                            <p className="text-xs text-gray-500">{event.timeWindow}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standard Locations Section */}
                  {pickupLocations.length > 0 && (
                    <div>
                      {marketEvents.length > 0 && <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 mt-4">Regular Locations</h4>}
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
                              {selectedLocationId === location.id && (
                                <Check className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatSchedule(location.schedule)}</span>
                            </div>
                            {location.notes && (
                              <p className="text-xs text-amber-600 mt-2">📝 {location.notes}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preferred time (Only show if not an event, or maybe allow it for events too as a "I'll be there at X" confirmation?) */}
                  {/* Let's keep it general for now. */}
                  <div className="pt-4">
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Preferred pickup time (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Saturday morning"
                      className="tm-input"
                      value={scheduledWindow}
                      onChange={(e) => setScheduledWindow(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleContinue}
                    className="w-full tm-btn bg-green-600 text-white hover:bg-green-700 mt-4"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2b: Delivery Details */}
              {step === 'delivery-details' && (
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
                      Delivery Address *
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
                        Preferred Window *
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
                            onClick={() =>
                              setSelectedDriverId(
                                selectedDriverId === driver.id ? null : driver.id
                              )
                            }
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
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase tracking-wider">Best match</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">⭐ {driver.rating.toFixed(1)} • {driver.distanceKm.toFixed(1)} km • {driver.availabilityLabel}</p>
                            </div>
                            {selectedDriverId === driver.id && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleContinue}
                    className="w-full tm-btn tm-btn-primary mt-4"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  {/* Order Summary */}
                  <div className="bg-[#f5f8ff] rounded-2xl p-4 space-y-3 border border-[#dce5f7]">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Item</span>
                      <span className="font-bold text-gray-900">{listing.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Price</span>
                      <span className="font-bold text-gray-900">{listing.price}</span>
                    </div>
                    {method === 'delivery' && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Delivery Fee</span>
                        <span className="font-bold text-gray-900">{DELIVERY_FEE_DISPLAY}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between">
                      <span className="text-sm font-bold text-gray-700">Method</span>
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        {method === 'pickup' ? (
                          <>
                            <MapPin className="w-4 h-4 text-green-600" /> Pickup
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4 text-blue-600" /> Delivery
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Location/Address details */}
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
                            {scheduledWindow && (
                              <p className="text-sm text-blue-600 mt-2">Preferred: {scheduledWindow}</p>
                            )}
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

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Note to seller (optional)
                    </label>
                    <textarea
                      placeholder="Any special instructions..."
                      rows={2}
                      className="tm-input resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full tm-btn font-black ${
                      method === 'pickup'
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                        : 'tm-btn-primary disabled:opacity-70'
                    } text-white`}
                  >
                    {isSubmitting ? 'Placing Order...' : 'Confirm Order'}
                  </button>

                  <p className="text-xs text-center text-gray-400">
                    The seller will be notified and will confirm your order
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
