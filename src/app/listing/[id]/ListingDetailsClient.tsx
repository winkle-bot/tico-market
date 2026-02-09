"use client";

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Truck, Share2, Heart, ChevronLeft, ShieldCheck, MessageCircle, ShoppingBag, CheckCircle, Flag, X, Loader2, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { categoryEmojis } from '@/lib/data';
import { notFound } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChatModal, CheckoutModal, AuthModal, ListingLocationMap } from '@/components';
import { ListingDetailSkeleton } from '@/components/Skeletons';
import { API_ROUTES } from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';
import type { Listing, User, MarketEvent } from '@/types';

export default function ListingDetailsClient({ listingId }: { listingId: string }) {
  const toast = useToast();
  const { user, isFavorite, toggleFavorite: contextToggleFavorite } = useAuth();
  const [listing, setListing] = useState<Listing | 'not_found' | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [drivers, setDrivers] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  
  // Modal states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [preferredCheckoutMethod, setPreferredCheckoutMethod] = useState<'delivery' | 'pickup' | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  // Order success state
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSeller(null);
        setDrivers([]);

        // Fetch listing
        const listingRes = await fetch(`${API_ROUTES.LISTINGS}/${listingId}`, {
          signal: controller.signal,
        });
        if (!listingRes.ok) {
          if (listingRes.status === 404) {
            setListing('not_found');
          } else {
            setLoadError('We could not load this listing right now. Please try again.');
            setListing(null);
          }
          return;
        }
        const listingData = await listingRes.json();
        setListing(listingData);

        // Fetch seller for pickup locations
        if (listingData.sellerId) {
          const sellerRes = await fetch(`${API_ROUTES.USERS}/${listingData.sellerId}`, {
            signal: controller.signal,
          });
          if (sellerRes.ok) {
            const sellerData = await sellerRes.json();
            setSeller(sellerData);
          }
        }

        // Fetch drivers for delivery option
        const driversRes = await fetch(`${API_ROUTES.LISTINGS}?type=driver&page=1&limit=40&sort=newest`, {
          signal: controller.signal,
        });
        if (driversRes.ok) {
          const payload = await driversRes.json();
          if (payload && Array.isArray(payload.data)) {
            setDrivers(payload.data);
          } else if (Array.isArray(payload)) {
            setDrivers(payload.filter((l: Listing) => l.type === 'driver'));
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setLoadError('We could not load this listing right now. Please try again.');
        setListing(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      controller.abort();
    };
  }, [listingId, reloadToken]);

  // Derive isLiked from context
  const isLiked = listing && listing !== 'not_found' ? isFavorite(listing.id) : false;

  const handleToggleFavorite = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (listing && listing !== 'not_found') {
      await contextToggleFavorite(listing.id);
    }
  };

  const handleGetItem = (preferredMethod: 'delivery' | 'pickup' | null = null) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setPreferredCheckoutMethod(preferredMethod);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    setIsCheckoutOpen(false);
    setOrderSuccess(orderId);
  };

  const handleShareListing = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing && listing !== 'not_found' ? listing.title : 'Tico Market listing',
          text: 'Check out this listing on Tico Market',
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Listing link copied to clipboard.');
    } catch {
      toast.error('Could not copy the listing link.');
    }
  };

  const handleOpenReportListing = () => {
    if (!listing || listing === 'not_found') return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!listing || listing === 'not_found') return;
    const trimmedReason = reportReason.trim();
    if (trimmedReason.length < 5) {
      toast.error('Please provide at least 5 characters for the report reason.');
      return;
    }

    setIsSubmittingReport(true);
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetType: 'listing',
        targetListingId: listing.id,
        reason: trimmedReason,
        details: reportDetails.trim() || undefined,
      }),
    });

    try {
      if (res.ok) {
        setIsReportModalOpen(false);
        setReportReason('');
        setReportDetails('');
        toast.success('Report submitted. Thank you.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Could not submit report');
      }
    } catch {
      toast.error('Could not submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) return <ListingDetailSkeleton />;
  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Unable to load listing</h1>
          <p className="text-sm text-gray-600 mb-6">{loadError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setReloadToken((prev) => prev + 1)}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (listing === 'not_found') return notFound();
  if (!listing) return null;

  // Check if this is the user's own listing
  const isOwnListing = user?.id === listing.sellerId;
  const hasValidLocation =
    Array.isArray(listing.location) &&
    listing.location.length === 2 &&
    Number.isFinite(listing.location[0]) &&
    Number.isFinite(listing.location[1]);
  const mapsLink = hasValidLocation
    ? `https://www.google.com/maps/search/?api=1&query=${listing.location[0]},${listing.location[1]}`
    : null;

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        formState={authForm}
        onFormChange={setAuthForm}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        listing={listing}
        currentUser={user}
        onAuthRequired={() => setIsAuthModalOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setPreferredCheckoutMethod(null);
        }}
        listing={listing}
        seller={seller}
        currentUser={user}
        drivers={drivers}
        preferredMethod={preferredCheckoutMethod}
        onSuccess={handleOrderSuccess}
        onAuthRequired={() => {
          setIsCheckoutOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Order Success Overlay */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase mb-2">Order Placed!</h2>
            <p className="text-gray-500 mb-6">
              The seller has been notified and will confirm your order soon. You can track it in your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOrderSuccess(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Continue Shopping
              </button>
              <Link
                href="/account"
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors text-center"
              >
                View Orders
              </Link>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-listing-title"
            className="w-full max-w-lg bg-white rounded-3xl p-6 border border-gray-100 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="report-listing-title" className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  Report Listing
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Help us keep the marketplace safe by describing the issue.
                </p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Close report modal"
                disabled={isSubmittingReport}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="report-reason" className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Reason
                </label>
                <input
                  id="report-reason"
                  type="text"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Spam, scam, counterfeit, abusive language..."
                  minLength={5}
                  maxLength={140}
                />
              </div>

              <div>
                <label htmlFor="report-details" className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  id="report-details"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Add any context that can help moderation."
                  maxLength={600}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                disabled={isSubmittingReport}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-2xl hover:bg-red-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="tm-shell h-16 flex items-center justify-between">
          <Link href="/" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors group">
            <ChevronLeft className="w-6 h-6 text-gray-900 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={handleShareListing}
              className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors text-[#60749f]"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={`p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors ${isLiked ? 'text-red-500' : 'text-[#60749f]'}`}
              aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-24">
        <div className="tm-shell">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left: Image Section */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-50 rounded-[40px] overflow-hidden border border-gray-100 relative shadow-inner">
                {listing.imageUrl ? (
                  <img 
                    src={listing.imageUrl} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <span className="text-9xl filter drop-shadow-xl">{categoryEmojis[listing.category] || '✨'}</span>
                  </div>
                )}
                {listing.verified && (
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-xl border border-blue-50">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Verified Listing</span>
                  </div>
                )}
              </div>

              <section className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Listing Location
                  </h2>
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 underline"
                    >
                      Open in Maps
                    </a>
                  )}
                </div>
                <div className="h-72">
                  <ListingLocationMap listing={listing} />
                </div>
                <div className="px-5 py-3 border-t border-gray-100 text-xs font-semibold text-gray-500">
                  {hasValidLocation
                    ? `Coordinates: ${listing.location[0].toFixed(5)}, ${listing.location[1].toFixed(5)}`
                    : 'Coordinates unavailable'}
                </div>
              </section>
            </div>

            {/* Right: Info Section */}
            <div className="flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-100">
                    {listing.category}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1 text-orange-500 font-black text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" /> {listing.rating}
                  </div>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                  {listing.title}
                </h1>
                
                <div className="text-3xl font-black text-blue-600 mb-6">
                  {listing.price}
                </div>

                <div className="flex items-center gap-2 text-gray-500 font-bold mb-8">
                  <MapPin className="w-5 h-5" />
                  <span>
                    {hasValidLocation
                      ? `${listing.location[0].toFixed(5)}, ${listing.location[1].toFixed(5)}`
                      : 'Location unavailable'}
                  </span>
                </div>

                {/* Pickup/Delivery badges */}
                {seller && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(seller.pickupLocations?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-100">
                        <MapPin className="w-3 h-3" />
                        Pickup available
                      </span>
                    )}
                    {seller.acceptsDelivery !== false && !listing.pickupConfig?.pickupOnly && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
                        <Truck className="w-3 h-3" />
                        Delivery available
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Seller Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#dce5f7] mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <Link href={`/seller/${listing.sellerId}`} className="flex items-center gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                      {listing.owner[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{listing.owner}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Seller</p>
                    </div>
                  </Link>
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="p-3 bg-white hover:bg-blue-600 hover:text-white rounded-2xl border border-[#dce5f7] shadow-sm transition-all group min-h-12"
                    aria-label="Message seller"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleOpenReportListing}
                    className="p-3 bg-white hover:bg-red-600 hover:text-white rounded-2xl border border-[#dce5f7] shadow-sm transition-all min-h-12"
                    aria-label="Report listing"
                    title="Report listing"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Reputation</div>
                    <div className="font-black text-gray-900">4.9 / 5</div>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 text-center">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Response</div>
                    <div className="font-black text-gray-900">&lt; 1 hr</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Description</h2>
                <p className="text-gray-600 leading-relaxed font-medium">
                  {listing.description || `Freshly listed ${listing.title} available for pickup or delivery in GAM. Reach out for details or more photos.`}
                </p>
              </div>

              {/* Availability & Logistics */}
              {(listing.pickupConfig?.leadTime || (listing.pickupConfig?.marketEvents && listing.pickupConfig.marketEvents.length > 0)) && (
                <div className="mb-8 p-6 bg-orange-50 rounded-3xl border border-orange-100">
                  <h2 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Availability & Pickup
                  </h2>
                  
                  {listing.pickupConfig.leadTime && (
                    <div className="mb-4">
                      <span className="text-[10px] font-black text-orange-400 uppercase block mb-1">Lead Time</span>
                      <p className="font-bold text-gray-900 text-lg">{listing.pickupConfig.leadTime}</p>
                    </div>
                  )}

                  {listing.pickupConfig.marketEvents && listing.pickupConfig.marketEvents.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-orange-400 uppercase block mb-2">Available at Markets</span>
                      <div className="space-y-2">
                        {listing.pickupConfig.marketEvents.map((event: MarketEvent) => (
                          <div key={event.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex justify-between items-center group hover:border-orange-300 transition-colors">
                              <div>
                                <div className="font-black text-sm text-gray-900">{event.name}</div>
                                <div className="text-xs font-bold text-gray-500 mt-1">{event.date} • {event.timeWindow}</div>
                              </div>
                              {event.wazeLink && (
                                <a 
                                  href={event.wazeLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                  title="Open in Waze"
                                >
                                  <MapPin className="w-5 h-5" />
                                </a>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar (Desktop) */}
              <div className="mt-auto hidden lg:flex gap-4">
                {isOwnListing ? (
                  <Link 
                    href="/account"
                    className="flex-1 bg-gray-900 hover:bg-black text-white font-black py-5 rounded-[24px] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                  >
                    Manage Listing
                  </Link>
                ) : (
                  <>
                    <button 
                      onClick={() => handleGetItem('delivery')}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] transition-all shadow-2xl shadow-orange-200 uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                    >
                      <Truck className="w-5 h-5" /> Express Ahora
                    </button>
                    <button 
                      onClick={() => handleGetItem()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[24px] transition-all shadow-2xl shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                    >
                      <ShoppingBag className="w-5 h-5" /> Get This Item
                    </button>
                    <button 
                      onClick={() => setIsChatOpen(true)}
                      className="px-8 bg-gray-900 hover:bg-black text-white font-black rounded-[24px] transition-all uppercase tracking-widest text-sm flex items-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Mobile Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#dce5f7] p-4 z-50 pb-safe">
        <div className="max-w-md mx-auto flex gap-3">
          {isOwnListing ? (
            <Link 
              href="/account"
              className="flex-1 bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs text-center"
            >
              Manage Listing
            </Link>
          ) : (
            <>
              <button 
                onClick={() => handleGetItem('delivery')}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-orange-200 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" /> Express
              </button>
              <button 
                onClick={() => handleGetItem()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Get This Item
              </button>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="px-6 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
