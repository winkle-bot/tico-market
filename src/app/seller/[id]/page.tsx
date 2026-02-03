"use client";

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Calendar, CheckCircle, ShieldCheck, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { categoryEmojis } from '@/lib/data';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import ChatModal from '@/components/ChatModal';

export default function SellerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const userRes = await fetch(`/api/users/${id}`);
        if (!userRes.ok) {
          setSeller('not_found');
          setIsLoading(false);
          return;
        }
        const userData = await userRes.json();
        setSeller(userData);

        const listingsRes = await fetch('/api/listings');
        const listingsData = await listingsRes.json();
        setSellerListings(listingsData.filter((l: any) => l.sellerId === id));
      } catch (err) {
        setSeller('not_found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-blue-600">Loading profile...</div>;
  if (seller === 'not_found') return notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header Background */}
      <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 w-full" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 sticky top-8">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-5xl mb-6 border-8 border-white shadow-lg">
                  {seller.name[0]}
                </div>
                
                <h1 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-2">
                  {seller.name}
                  {seller.verified && <CheckCircle className="w-6 h-6 text-blue-500 fill-current" />}
                </h1>
                
                <div className="flex items-center gap-2 text-orange-500 font-black text-lg mb-6">
                  <Star className="w-5 h-5 fill-current" />
                  {seller.rating} 
                  <span className="text-gray-400 font-medium text-sm">({seller.reviews?.length || 0} reviews)</span>
                </div>

                <div className="w-full space-y-4 text-left">
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold">{seller.location}, Costa Rica</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold">Member since {seller.joined}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100 my-8" />

                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (sellerListings.length === 1) {
                        // If only one listing, go directly to chat
                        setSelectedListing(sellerListings[0]);
                        setIsChatOpen(true);
                      } else if (sellerListings.length > 1) {
                        // Show picker if multiple listings
                        setShowListingPicker(true);
                      }
                    }}
                    disabled={sellerListings.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="w-5 h-5" /> Message Seller
                  </button>
                  <Link 
                    href="/"
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm text-center"
                  >
                    Back to Feed
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-green-500" /> About the Seller
              </h2>
              <p className="text-gray-600 leading-relaxed text-lg italic">
                "{seller.bio}"
              </p>
            </div>

            {/* Active Listings */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wider ml-2">
                Active Listings ({sellerListings.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sellerListings.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 hover:border-blue-200 transition-colors cursor-pointer group">
                    <div className="w-24 h-24 bg-blue-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-all">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">
                          {categoryEmojis[item.category] || '✨'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                      <p className="text-blue-600 font-black">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-wider">
                Recent Reviews
              </h2>
              <div className="space-y-8">
                {seller.reviews && seller.reviews.length > 0 ? seller.reviews.map((review: any) => (
                  <div key={review.id} className="relative pl-6 border-l-2 border-blue-100">
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-600" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-gray-900">{review.user}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                )) : (
                  <p className="text-gray-400 font-medium italic">No reviews yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Listing Picker Modal */}
      <AnimatePresence>
        {showListingPicker && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowListingPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Select a Listing</h3>
                  <p className="text-sm text-gray-500">Which item do you want to discuss?</p>
                </div>
                <button
                  onClick={() => setShowListingPicker(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                {sellerListings.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedListing(item);
                      setShowListingPicker(false);
                      setIsChatOpen(true);
                    }}
                    className="w-full p-4 rounded-2xl border border-gray-100 flex gap-4 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{categoryEmojis[item.category] || '✨'}</span>
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 truncate">{item.title}</h4>
                      <p className="text-blue-600 font-black text-sm">{item.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      {selectedListing && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedListing(null);
          }}
          listing={{
            id: selectedListing.id,
            title: selectedListing.title,
            sellerId: selectedListing.sellerId,
            owner: selectedListing.owner,
            imageUrl: selectedListing.imageUrl
          }}
          currentUser={user}
          onAuthRequired={() => setIsAuthModalOpen(true)}
        />
      )}
    </div>
  );
}
