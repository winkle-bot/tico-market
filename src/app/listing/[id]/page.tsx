"use client";

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Truck, Share2, Heart, ChevronLeft, ShieldCheck, MessageCircle, ShoppingBag, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { categoryEmojis } from '@/lib/data';
import { notFound } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChatModal, CheckoutModal, AuthModal } from '@/components';
import { ListingDetailSkeleton } from '@/components/Skeletons';
import { API_ROUTES } from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import type { Listing, User } from '@/types';

export default function ListingDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoading: authLoading, isFavorite, toggleFavorite: contextToggleFavorite } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | 'not_found' | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [drivers, setDrivers] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  // Order success state
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        // Fetch listing
        const listingRes = await fetch(`${API_ROUTES.LISTINGS}/${id}`);
        if (!listingRes.ok) {
          setListing('not_found');
          setIsLoading(false);
          return;
        }
        const listingData = await listingRes.json();
        setListing(listingData);

        // Fetch seller for pickup locations
        if (listingData.sellerId) {
          const sellerRes = await fetch(`${API_ROUTES.USERS}/${listingData.sellerId}`);
          if (sellerRes.ok) {
            const sellerData = await sellerRes.json();
            setSeller(sellerData);
          }
        }

        // Fetch drivers for delivery option
        const allListingsRes = await fetch(API_ROUTES.LISTINGS);
        if (allListingsRes.ok) {
          const allListings = await allListingsRes.json();
          setDrivers(allListings.filter((l: Listing) => l.type === 'driver'));
        }
      } catch (err) {
        setListing('not_found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const handleGetItem = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    setIsCheckoutOpen(false);
    setOrderSuccess(orderId);
  };

  const handleReportListing = async () => {
    if (!listing || listing === 'not_found') return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const reason = window.prompt('Report reason (required):');
    if (!reason || reason.trim().length < 5) return;
    const details = window.prompt('Additional details (optional):');

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetType: 'listing',
        targetListingId: listing.id,
        reason: reason.trim(),
        details: details?.trim() || undefined,
      }),
    });

    if (res.ok) {
      alert('Report submitted. Thank you.');
    } else {
      const err = await res.json();
      alert(err.error || 'Could not submit report');
    }
  };

  if (isLoading) return <ListingDetailSkeleton />;
  if (listing === 'not_found') return notFound();
  if (!listing) return null;

  // Check if this is the user's own listing
  const isOwnListing = user?.id === listing.sellerId;

  return (
    <div className="min-h-screen bg-white">
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
        onClose={() => setIsCheckoutOpen(false)}
        listing={listing}
        seller={seller}
        currentUser={user}
        drivers={drivers}
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

      {/* Header / Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
            <ChevronLeft className="w-6 h-6 text-gray-900 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex gap-2">
            <button 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
              aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <span>San José, Costa Rica</span>
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
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 mb-8">
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
                    className="p-3 bg-white hover:bg-blue-600 hover:text-white rounded-2xl border border-gray-100 shadow-sm transition-all group"
                    aria-label="Message seller"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleReportListing}
                    className="p-3 bg-white hover:bg-red-600 hover:text-white rounded-2xl border border-gray-100 shadow-sm transition-all"
                    aria-label="Report listing"
                  >
                    !
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
                        {listing.pickupConfig.marketEvents.map((event: any) => (
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
                      onClick={handleGetItem}
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 pb-safe">
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
                onClick={handleGetItem}
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
