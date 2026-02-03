"use client";

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Truck, Share2, Heart, ChevronLeft, ShieldCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { categoryEmojis } from '@/lib/data';
import { notFound } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatModal from '@/components/ChatModal';

export default function ListingDetails({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) {
          setListing('not_found');
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setListing(data);
      } catch (err) {
        setListing('not_found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  // Check if listing is in user's favorites
  useEffect(() => {
    if (user && listing && listing.id) {
      fetch(`/api/users/${user.id}`)
        .then(res => res.json())
        .then(userData => {
          if (userData.favorites && userData.favorites.includes(listing.id)) {
            setIsLiked(true);
          }
        })
        .catch(() => {});
    }
  }, [user, listing]);

  const toggleFavorite = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const newLiked = !isLiked;
    setIsLiked(newLiked);

    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleFavorite',
          listingId: listing.id
        })
      });
    } catch (err) {
      // Revert on error
      setIsLiked(!newLiked);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-blue-600">Loading item...</div>;
  if (listing === 'not_found') return notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        listing={listing}
        currentUser={user}
        onAuthRequired={() => setIsAuthModalOpen(true)}
      />

      {/* Header / Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
            <ChevronLeft className="w-6 h-6 text-gray-900 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleFavorite}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
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
                  >
                    <MessageCircle className="w-5 h-5" />
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

              {/* Action Bar (Desktop only, mobile will be fixed at bottom) */}
              <div className="mt-auto hidden lg:flex gap-4">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[24px] transition-all shadow-2xl shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                  <Truck className="w-5 h-5" /> Book Express Delivery
                </button>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="px-8 bg-gray-900 hover:bg-black text-white font-black rounded-[24px] transition-all uppercase tracking-widest text-sm flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" /> Message
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Mobile Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 pb-safe">
        <div className="max-w-md mx-auto flex gap-3">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            <Truck className="w-4 h-4" /> Express Delivery
          </button>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="px-6 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Chat
          </button>
        </div>
      </div>
    </div>
  );
}
