'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, MapPin, Route, ShoppingBag, Truck, XCircle, Zap } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { withCsrfHeaders } from '@/lib/csrf';
import { formatFeriaPickupCode, getFeriaPreorderMeta } from '@/lib/feria-preorders';
import { useI18n } from '@/context/I18nContext';
import { DeliveryRoomModal } from '@/components/account/DeliveryRoomModal';
import { FeriaPickupScanner } from '@/components/account/FeriaPickupScanner';
import { OrderPickupQrCode } from '@/components/account/OrderPickupQrCode';
import { OrderDriverLiveMap } from '@/components/account/OrderDriverLiveMap';
import { OpenDisputeModal } from '@/components/disputes/OpenDisputeModal';
import type { DeliveryMeta, DeliveryTrackingPhase, FeriaPreorderMeta, Order, Review } from '@/types';

const deliveryPhaseOrder: DeliveryTrackingPhase[] = [
  'awaiting_confirmation',
  'awaiting_pickup',
  'picked_up',
  'near_buyer',
  'delivered',
];

const deliveryPhaseLabels: Record<DeliveryTrackingPhase, string> = {
  awaiting_confirmation: 'Confirm',
  awaiting_pickup: 'Pickup',
  picked_up: 'On Route',
  near_buyer: 'Nearby',
  delivered: 'Delivered',
};

const deliveryPhaseDescriptions: Record<DeliveryTrackingPhase, string> = {
  awaiting_confirmation: 'Seller still needs to confirm this order.',
  awaiting_pickup: 'The order is confirmed and ready for driver handoff.',
  picked_up: 'The package is with the driver and moving to the buyer.',
  near_buyer: 'The driver is approaching the drop-off point.',
  delivered: 'The delivery handoff is complete.',
};

function getDeliveryPhase(order: Order, deliveryMeta: DeliveryMeta | null): DeliveryTrackingPhase {
  if (deliveryMeta?.phase) return deliveryMeta.phase;
  if (order.status === 'completed') return 'delivered';
  if (order.status === 'in_transit') return 'picked_up';
  if (order.status === 'confirmed') return 'awaiting_pickup';
  return 'awaiting_confirmation';
}

function formatArrivalTime(dateLocale: string, etaMinutes: number | undefined): string | null {
  if (etaMinutes === undefined || etaMinutes === null) return null;
  return new Date(Date.now() + etaMinutes * 60_000).toLocaleTimeString(dateLocale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUpdateTime(dateLocale: string, value: string | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleTimeString(dateLocale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getLatLngPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [Number(lat), Number(lng)];
}

function getFeriaReservationLabel(preorder: FeriaPreorderMeta, status: Order['status']): string {
  if (preorder.pickupCompletedAt || status === 'completed') {
    return 'Feria pickup completed.';
  }

  if (preorder.reservationStatus === 'confirmed' || status === 'confirmed') {
    return preorder.pickupQrToken
      ? 'Feria reservation confirmed. Buyer QR ready for handoff.'
      : 'Feria reservation confirmed.';
  }

  if (status === 'cancelled') {
    return 'Feria reservation cancelled.';
  }

  return 'Waiting for the vendor to confirm this feria reservation.';
}

function getSellerConfirmLabel(feriaPreorder: FeriaPreorderMeta | null): string {
  return feriaPreorder ? 'Confirm Reservation' : 'Confirm Order';
}

function getSellerConfirmMessage(feriaPreorder: FeriaPreorderMeta | null): string {
  return feriaPreorder
    ? 'Vendor confirmed the feria reservation.'
    : 'Seller confirmed. Preparing handoff to driver.';
}

function getSellerConfirmSuccess(feriaPreorder: FeriaPreorderMeta | null): string {
  return feriaPreorder ? 'Reservation confirmed.' : 'Order confirmed.';
}

function getSellerDeclineLabel(feriaPreorder: FeriaPreorderMeta | null): string {
  return feriaPreorder ? 'Decline Reservation' : 'Decline';
}

function getBuyerCancelLabel(feriaPreorder: FeriaPreorderMeta | null): string {
  return feriaPreorder ? 'Cancel Reservation' : 'Cancel Order';
}

export function OrdersTab({ 
  orders, 
  userId, 
  reviewsByOrder,
  onStatusChange 
}: { 
  orders: Order[]; 
  userId: string;
  reviewsByOrder: Record<string, Review>;
  onStatusChange: () => void;
}) {
  const toast = useToast();
  const { locale } = useI18n();
  const dateLocale = locale === 'es' ? 'es-CR' : 'en-US';
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deliveryNoteByOrder, setDeliveryNoteByOrder] = useState<Record<string, string>>({});
  const [deliveryEtaByOrder, setDeliveryEtaByOrder] = useState<Record<string, string>>({});
  const [deliveryLocationByOrder, setDeliveryLocationByOrder] = useState<Record<string, string>>({});
  const [pickupVerificationOrderId, setPickupVerificationOrderId] = useState<string | null>(null);
  const [deliveryRoomOrderId, setDeliveryRoomOrderId] = useState<string | null>(null);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const activeDeliveryRoomOrder = deliveryRoomOrderId
    ? orders.find((entry) => entry.id === deliveryRoomOrderId) || null
    : null;

  const updateOrder = async (
    orderId: string,
    payload: Record<string, unknown>,
    successMessage = 'Order status updated.'
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onStatusChange();
        toast.success(successMessage);
        return true;
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update order');
      }
    } catch {
      toast.error('Error updating order');
    }

    return false;
  };

  const getDeliveryMeta = (order: Order): DeliveryMeta | null => {
    const raw = order.listingSnapshot?.deliveryMeta;
    if (!raw || typeof raw !== 'object') return null;
    return raw as DeliveryMeta;
  };

  const submitDriverTracking = async (
    order: Order,
    payload: {
      phase?: DeliveryTrackingPhase;
      etaMinutes?: number | null;
      status?: 'in_transit' | 'completed';
      successMessage: string;
      message?: string;
    }
  ) => {
    const etaValue = deliveryEtaByOrder[order.id]?.trim();
    const locationValue = deliveryLocationByOrder[order.id]?.trim();
    const parsedEta =
      payload.etaMinutes !== undefined
        ? payload.etaMinutes
        : etaValue
          ? Number.parseInt(etaValue, 10)
          : undefined;

    const hasTrackingDetails =
      payload.phase !== undefined ||
      payload.status !== undefined ||
      Boolean(payload.message) ||
      (parsedEta !== undefined && Number.isFinite(parsedEta)) ||
      Boolean(locationValue);

    if (!hasTrackingDetails) {
      toast.error('Add an ETA or location before posting a live update.');
      return;
    }

    const success = await updateOrder(
      order.id,
      {
        ...(payload.status ? { status: payload.status } : {}),
        trackingEvent: {
          ...(payload.phase ? { phase: payload.phase } : {}),
          ...(payload.message ? { message: payload.message } : {}),
          ...(parsedEta !== undefined && Number.isFinite(parsedEta) ? { etaMinutes: parsedEta } : {}),
          ...(locationValue ? { driverLocationLabel: locationValue } : {}),
        },
      },
      payload.successMessage
    );

    if (success && payload.status === 'completed') {
      setDeliveryEtaByOrder((prev) => ({ ...prev, [order.id]: '' }));
      setDeliveryLocationByOrder((prev) => ({ ...prev, [order.id]: '' }));
    }
  };

  const submitPickupVerification = async (order: Order, token: string) => {
    setPickupVerificationOrderId(order.id);
    try {
      await updateOrder(
        order.id,
        {
          pickupVerification: {
            token,
          },
        },
        'Feria pickup completed.'
      );
    } finally {
      setPickupVerificationOrderId((current) => (current === order.id ? null : current));
    }
  };

  const submitReview = async () => {
    if (!reviewingOrderId || isSubmittingReview) return;

    setReviewError(null);
    setIsSubmittingReview(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          orderId: reviewingOrderId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      setReviewingOrderId(null);
      setReviewComment('');
      setReviewRating(5);
      onStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit review';
      setReviewError(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      in_transit: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      confirmed: <CheckCircle className="w-3 h-3" />,
      in_transit: <Truck className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
    };
    const labels: Record<string, string> = {
      pending: 'Awaiting Confirmation',
      confirmed: 'Confirmed',
      in_transit: 'In Transit',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.pending}`}>
        {icons[status]}
        {labels[status] || status}
      </span>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500">Your purchases and sales will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => {
        const isSeller = order.sellerId === userId;
        const isBuyer = order.buyerId === userId;
        const isDriver = order.driverId === userId;
        const hasReview = Boolean(reviewsByOrder[order.id]);
        const deliveryMeta = getDeliveryMeta(order);
        const updates = deliveryMeta?.updates || [];
        const recentUpdates = updates.slice(-3).reverse();
        const latestUpdate = recentUpdates[0];
        const driverEta = deliveryMeta?.estimatedEtaMinutes;
        const phase = getDeliveryPhase(order, deliveryMeta);
        const phaseIndex = deliveryPhaseOrder.indexOf(phase);
        const nextPhase = deliveryPhaseOrder[Math.min(phaseIndex + 1, deliveryPhaseOrder.length - 1)];
        const etaArrivalTime = formatArrivalTime(dateLocale, driverEta);
        const lastUpdateTime = formatUpdateTime(dateLocale, latestUpdate?.createdAt);
        const driverEtaDraft = deliveryEtaByOrder[order.id] ?? (driverEta !== undefined ? String(driverEta) : '');
        const driverLocationDraft = deliveryLocationByOrder[order.id] ?? (deliveryMeta?.driverLocationLabel || '');
        const pickupCoords = getLatLngPair(order.listingSnapshot?.location);
        const feriaPreorder = getFeriaPreorderMeta(order.listingSnapshot);
        const pickupCode = formatFeriaPickupCode(feriaPreorder?.pickupQrToken);
        const pickupCompletedAt = formatUpdateTime(dateLocale, feriaPreorder?.pickupCompletedAt);
        
        return (
          <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            {/* Order header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isSeller ? `Buyer: ${order.buyerName}` : `Seller: ${order.sellerName}`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                {feriaPreorder && (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700">
                    Feria Pre-Order
                  </span>
                )}
                {order.type === 'pickup' ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pickup
                  </span>
                ) : (
                  <span className="text-blue-600 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Delivery
                  </span>
                )}
              </div>
            </div>

            {/* Order content */}
            <div className="flex gap-4 mb-4">
              <div className="relative w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {order.listingSnapshot?.imageUrl ? (
                  <Image src={order.listingSnapshot.imageUrl} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/listing/${order.listingId}`}
                  className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {order.listingSnapshot?.title || 'Unknown Item'}
                </Link>
                <p className="text-blue-600 font-bold text-lg">{order.listingSnapshot?.price}</p>
                {order.type === 'delivery' && order.deliveryFee && (
                  <p className="text-xs text-gray-500">+ ₡{order.deliveryFee.toLocaleString()} delivery</p>
                )}
              </div>
            </div>

            {/* Location/Address info */}
            {order.type === 'pickup' && order.pickupLocation && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p className="font-bold text-gray-900">{order.pickupLocation.name}</p>
                <p className="text-gray-600">{order.pickupLocation.address}</p>
                {order.scheduledWindow && (
                  <p className="text-blue-600 mt-1">Preferred: {order.scheduledWindow}</p>
                )}
                {feriaPreorder && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                      {feriaPreorder.eventDate} • {feriaPreorder.timeWindow}
                    </p>
                    <p className="mt-1 font-semibold text-orange-900">
                      {getFeriaReservationLabel(feriaPreorder, order.status)}
                    </p>
                    {pickupCompletedAt && (
                      <p className="mt-1 text-xs text-orange-700">Completed at {pickupCompletedAt}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {feriaPreorder?.pickupQrToken && isBuyer && order.status === 'confirmed' && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Feria Pickup QR
                </p>
                <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <OrderPickupQrCode token={feriaPreorder.pickupQrToken} />
                  <div className="text-sm text-emerald-900 sm:max-w-[220px]">
                    <p className="font-semibold">Show this QR to the vendor at pickup.</p>
                    {pickupCode && <p className="mt-2 text-xs font-black uppercase tracking-widest text-emerald-700">Code: {pickupCode}</p>}
                  </div>
                </div>
              </div>
            )}

            {feriaPreorder?.pickupQrToken && isSeller && order.status === 'confirmed' && !feriaPreorder.pickupCompletedAt && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Feria Pickup Verification
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Scan the buyer QR or paste the token to complete the feria handoff.
                </p>
                {pickupCode && <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-500">Fallback code: {pickupCode}</p>}
                <div className="mt-3">
                  <FeriaPickupScanner
                    isSubmitting={pickupVerificationOrderId === order.id}
                    onTokenDetected={(token) => {
                      void submitPickupVerification(order, token);
                    }}
                  />
                </div>
              </div>
            )}
            {order.type === 'delivery' && order.deliveryAddress && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p className="font-bold text-gray-900">Deliver to:</p>
                <p className="text-gray-600">{order.deliveryAddress}</p>
              </div>
            )}

            {order.type === 'delivery' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Express Tracking
                  </p>
                  <p className="text-xs text-blue-700 font-bold">
                    {driverEta !== undefined && driverEta !== null ? `ETA ~${driverEta} min` : 'ETA pending'}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {deliveryPhaseOrder.map((deliveryStep, idx) => (
                    <div key={deliveryStep} className="text-center">
                      <div className={`w-6 h-6 rounded-full mx-auto mb-1 border ${idx <= phaseIndex ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}`} />
                      <p className="text-[10px] text-blue-700 font-semibold">{deliveryPhaseLabels[deliveryStep]}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 text-xs text-blue-700 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <p className="font-black uppercase tracking-widest text-[10px] text-blue-500">Current Stage</p>
                    <p className="mt-1 font-semibold text-blue-900">{deliveryPhaseLabels[phase]}</p>
                    <p className="mt-1 text-blue-700">{deliveryPhaseDescriptions[phase]}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <p className="font-black uppercase tracking-widest text-[10px] text-blue-500">Next Step</p>
                    <p className="mt-1 font-semibold text-blue-900">
                      {phase === 'delivered'
                        ? 'Delivery finished'
                        : deliveryPhaseLabels[nextPhase]}
                    </p>
                    <p className="mt-1 text-blue-700">
                      {phase === 'delivered'
                        ? 'No further delivery action is required.'
                        : deliveryPhaseDescriptions[nextPhase]}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Driver: {order.driverName || 'Unassigned'}</p>
                  <p>
                    Arrival:
                    <span className="ml-1 font-semibold text-blue-900">
                      {etaArrivalTime
                        ? `${etaArrivalTime}${driverEta !== undefined && driverEta !== null ? ` (${driverEta} min)` : ''}`
                        : 'Waiting for live ETA'}
                    </span>
                  </p>
                  {deliveryMeta?.driverLocationLabel && <p>Location: {deliveryMeta.driverLocationLabel}</p>}
                  {lastUpdateTime && <p>Last update: {lastUpdateTime}</p>}
                </div>
              </div>
            )}

            {order.type === 'delivery' && isDriver && order.status !== 'completed' && order.status !== 'cancelled' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Live Update</p>
                  <p className="text-xs text-slate-600 mt-1">Keep ETA and location current so buyer and seller see the right next step.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    ETA (minutes)
                    <input
                      type="number"
                      min={0}
                      max={240}
                      value={driverEtaDraft}
                      onChange={(e) =>
                        setDeliveryEtaByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="15"
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Current area
                    <input
                      type="text"
                      value={driverLocationDraft}
                      onChange={(e) =>
                        setDeliveryLocationByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="San Pedro"
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
                    />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() =>
                        void submitDriverTracking(order, {
                          status: 'in_transit',
                          phase: 'picked_up',
                          successMessage: 'Pickup confirmed.',
                        })
                      }
                      className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
                    >
                      I Picked It Up
                    </button>
                  )}
                  <button
                    onClick={() =>
                      void submitDriverTracking(order, {
                        successMessage: 'Live ETA updated.',
                      })
                    }
                    className="bg-white text-slate-700 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
                  >
                    Save ETA
                  </button>
                  {order.status === 'in_transit' && (
                    <>
                      <button
                        onClick={() =>
                          void submitDriverTracking(order, {
                            phase: 'near_buyer',
                            successMessage: 'Buyer notified.',
                          })
                        }
                        className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                      >
                        Near Buyer
                      </button>
                      <button
                        onClick={() =>
                          void submitDriverTracking(order, {
                            status: 'completed',
                            phase: 'delivered',
                            etaMinutes: 0,
                            successMessage: 'Delivery completed.',
                          })
                        }
                        className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm sm:col-span-3"
                      >
                        Delivered
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {order.type === 'delivery' &&
              order.status !== 'completed' &&
              order.status !== 'cancelled' &&
              order.driverId && (
                <OrderDriverLiveMap
                  driverUserId={order.driverId}
                  driverName={order.driverName}
                  dateLocale={dateLocale}
                  pickupCoords={pickupCoords}
                />
              )}

            {order.type === 'delivery' && order.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => setDeliveryRoomOrderId(order.id)}
                className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-[#dce5f7] bg-[#f5f8ff] py-3 text-sm font-bold text-[#2f539e] hover:bg-[#edf2ff] transition-colors"
              >
                <Route className="w-4 h-4" />
                Open Delivery Room
              </button>
            )}

            {order.type === 'delivery' && recentUpdates.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <Route className="w-3.5 h-3.5" /> Live Order Room
                </p>
                {recentUpdates.map((update) => (
                  <div key={update.id} className="text-xs text-slate-700">
                    <span className="font-bold capitalize">{update.byRole}</span>
                    <span className="mx-1 text-slate-400">•</span>
                    <span>{update.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-yellow-50 rounded-xl p-3 mb-4 text-sm border border-yellow-100">
                <p className="text-yellow-800">📝 {order.notes}</p>
              </div>
            )}

            {/* Actions */}
            {order.status === 'pending' && isSeller && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        status: 'confirmed',
                        trackingEvent: {
                          ...(order.type === 'delivery' ? { phase: 'awaiting_pickup' } : {}),
                          message: getSellerConfirmMessage(feriaPreorder),
                        },
                      },
                      getSellerConfirmSuccess(feriaPreorder)
                    )
                  }
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  {getSellerConfirmLabel(feriaPreorder)}
                </button>
                <button
                  onClick={() => updateOrder(
                    order.id,
                    { status: 'cancelled' },
                    feriaPreorder ? 'Reservation declined.' : 'Order cancelled.'
                  )}
                  className="px-4 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  {getSellerDeclineLabel(feriaPreorder)}
                </button>
              </div>
            )}
            {order.status === 'confirmed' && isSeller && (
              <div className="grid gap-2 sm:grid-cols-3">
                {order.type === 'delivery' && (
                  <button
                    onClick={() =>
                      updateOrder(
                        order.id,
                        {
                          trackingEvent: {
                            phase: 'awaiting_pickup',
                            message: 'Seller says the package is ready for pickup.',
                          },
                        },
                        'Pickup readiness posted.'
                      )
                    }
                    className="bg-white text-blue-700 border border-blue-200 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
                  >
                    Ready for Pickup
                  </button>
                )}
                {order.type === 'delivery' && (
                  <button
                    onClick={() =>
                      updateOrder(
                        order.id,
                        {
                          status: 'in_transit',
                          trackingEvent: {
                            phase: 'picked_up',
                            message: 'Package handed to driver.',
                          },
                        },
                        'Driver handoff recorded.'
                      )
                    }
                    className="bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
                  >
                    Hand to Driver
                  </button>
                )}
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      { status: 'completed', trackingEvent: { phase: 'delivered', message: 'Seller marked order completed.' } },
                      'Order completed.'
                    )
                  }
                  className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Mark Completed
                </button>
              </div>
            )}
            {order.status === 'in_transit' && isSeller && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    { status: 'completed', trackingEvent: { phase: 'delivered', message: 'Seller marked as delivered.' } },
                    'Order completed.'
                  )
                }
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                Mark Completed
              </button>
            )}
            {order.status === 'pending' && isBuyer && (
              <button
                onClick={() => updateOrder(
                  order.id,
                  { status: 'cancelled' },
                  feriaPreorder ? 'Reservation cancelled.' : 'Order cancelled.'
                )}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                {getBuyerCancelLabel(feriaPreorder)}
              </button>
            )}
            {order.status === 'in_transit' && isBuyer && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    {
                      status: 'completed',
                      trackingEvent: { phase: 'delivered', message: 'Buyer confirmed delivery received.' },
                    },
                    'Thanks. Delivery confirmed.'
                  )
                }
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                I Received It
              </button>
            )}
            {order.type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled' && (isBuyer || isSeller || isDriver) && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={deliveryNoteByOrder[order.id] || ''}
                  onChange={(e) =>
                    setDeliveryNoteByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                  }
                  placeholder="Post a quick update"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    const note = (deliveryNoteByOrder[order.id] || '').trim();
                    if (!note) return;
                    void updateOrder(
                      order.id,
                      {
                        trackingEvent: {
                          message: note,
                        },
                      },
                      'Update posted.'
                    );
                    setDeliveryNoteByOrder((prev) => ({ ...prev, [order.id]: '' }));
                  }}
                  className="px-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
                >
                  Post
                </button>
              </div>
            )}
            {order.status === 'completed' && isBuyer && !hasReview && (
              <button
                onClick={() => {
                  setReviewingOrderId(order.id);
                  setReviewRating(5);
                  setReviewComment('');
                  setReviewError(null);
                }}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
              >
                Leave Review
              </button>
            )}
            {order.status === 'completed' && hasReview && (
              <div className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl text-sm text-center">
                Reviewed: {reviewsByOrder[order.id].rating}/5
              </div>
            )}
            {isBuyer && ['confirmed', 'in_transit', 'completed'].includes(order.status) && (
              <button
                onClick={() => setDisputeOrderId(order.id)}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-50 text-orange-700 border border-orange-200 font-bold py-2.5 rounded-xl hover:bg-orange-100 transition-colors text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                Open Dispute
              </button>
            )}
          </div>
        );
      })}

      <AnimatePresence>
        {activeDeliveryRoomOrder && (
          <DeliveryRoomModal
            dateLocale={dateLocale}
            isOpen={true}
            onClose={() => setDeliveryRoomOrderId(null)}
            order={activeDeliveryRoomOrder}
            userId={userId}
          />
        )}
        {disputeOrderId && (
          <OpenDisputeModal
            orderId={disputeOrderId}
            onClose={() => setDisputeOrderId(null)}
            onSuccess={() => {
              setDisputeOrderId(null);
              onStatusChange();
            }}
          />
        )}
        {reviewingOrderId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-black text-gray-900 mb-2 uppercase">Leave a Review</h3>
              <p className="text-sm text-gray-500 mb-4">Rate your order experience.</p>

              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setReviewRating(value)}
                    className={`w-10 h-10 rounded-full border font-black ${
                      reviewRating >= value
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional comment"
                rows={4}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
              />

              {reviewError && (
                <p className="text-sm text-red-600 mt-3">{reviewError}</p>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setReviewingOrderId(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={isSubmittingReview}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
