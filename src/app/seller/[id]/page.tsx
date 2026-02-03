import React from 'react';
import { Star, MapPin, Calendar, CheckCircle, ArrowLeft, ShieldCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { sellers, listings, categoryEmojis } from '@/lib/data';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerProfile({ params }: PageProps) {
  const { id } = await params;
  const seller = sellers.find((s) => s.id === id);

  if (!seller) {
    notFound();
  }

  const sellerListings = listings.filter((l) => l.sellerId === id);

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
                  <CheckCircle className="w-6 h-6 text-blue-500 fill-current" />
                </h1>
                
                <div className="flex items-center gap-2 text-orange-500 font-black text-lg mb-6">
                  <Star className="w-5 h-5 fill-current" />
                  {seller.rating} 
                  <span className="text-gray-400 font-medium text-sm">({seller.reviews.length} reviews)</span>
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
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2">
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
                    <div className="w-24 h-24 bg-blue-50 rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:bg-blue-600 group-hover:scale-105 transition-all">
                      {categoryEmojis[item.category] || '✨'}
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
                {seller.reviews.map(review => (
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
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
