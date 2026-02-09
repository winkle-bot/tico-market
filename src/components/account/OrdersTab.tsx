'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, MapPin, Route, ShoppingBag, Truck, XCircle, Zap } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { withCsrfHeaders } from '@/lib/csrf';
import type { DeliveryMeta, Order, Review } from '@/types';

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
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deliveryNoteByOrder, setDeliveryNoteByOrder] = useState<Record<string, string>>({});

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
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update order');
      }
    } catch {
      toast.error('Error updating order');
    }
  };

  const getDeliveryMeta = (order: Order): DeliveryMeta | null => {
    const raw = order.listingSnapshot?.deliveryMeta;
    if (!raw || typeof raw !== 'object') return null;
    return raw as DeliveryMeta;
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
      pending: 'Pending',
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
        const driverEta = deliveryMeta?.estimatedEtaMinutes;
        const phase = deliveryMeta?.phase || (order.status === 'in_transit' ? 'picked_up' : 'awaiting_confirmation');
        const phaseIndex = (() => {
          const map: Record<string, number> = {
            awaiting_confirmation: 0,
            awaiting_pickup: 1,
            picked_up: 2,
            near_buyer: 3,
            delivered: 4,
          };
          return map[phase] ?? 0;
        })();
        
        return (
          <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            {/* Order header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('es-CR')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isSeller ? `Buyer: ${order.buyerName}` : `Seller: ${order.sellerName}`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
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
                    {driverEta ? `ETA ~${driverEta} min` : 'Updating ETA'}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {['Seller', 'Pickup', 'En ruta', 'Cerca', 'Entregado'].map((label, idx) => (
                    <div key={label} className="text-center">
                      <div className={`w-6 h-6 rounded-full mx-auto mb-1 border ${idx <= phaseIndex ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}`} />
                      <p className="text-[10px] text-blue-700 font-semibold">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Driver: {order.driverName || 'Unassigned'}</p>
                  {deliveryMeta?.driverLocationLabel && <p>Location: {deliveryMeta.driverLocationLabel}</p>}
                </div>
              </div>
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
                          phase: 'awaiting_pickup',
                          message: 'Seller confirmed. Preparing handoff to driver.',
                        },
                      },
                      'Order confirmed.'
                    )
                  }
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Confirm Order
                </button>
                <button
                  onClick={() => updateOrder(order.id, { status: 'cancelled' }, 'Order cancelled.')}
                  className="px-4 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Decline
                </button>
              </div>
            )}
            {order.status === 'confirmed' && isSeller && (
              <div className="flex gap-2">
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
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
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
                  className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Mark Completed
                </button>
              </div>
            )}
            {order.status === 'confirmed' && isDriver && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    {
                      status: 'in_transit',
                      trackingEvent: {
                        phase: 'picked_up',
                        message: 'Driver picked up package from seller.',
                      },
                    },
                    'Pickup confirmed.'
                  )
                }
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
              >
                I Picked It Up
              </button>
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
            {order.status === 'in_transit' && isDriver && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        trackingEvent: {
                          phase: 'near_buyer',
                          message: 'Driver is near the delivery point.',
                          etaMinutes: 8,
                        },
                      },
                      'Buyer notified.'
                    )
                  }
                  className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Near Buyer
                </button>
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        status: 'completed',
                        trackingEvent: {
                          phase: 'delivered',
                          message: 'Driver delivered the order.',
                          etaMinutes: 0,
                        },
                      },
                      'Delivery completed.'
                    )
                  }
                  className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Delivered
                </button>
              </div>
            )}
            {order.status === 'pending' && isBuyer && (
              <button
                onClick={() => updateOrder(order.id, { status: 'cancelled' }, 'Order cancelled.')}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel Order
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
          </div>
        );
      })}

      <AnimatePresence>
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
