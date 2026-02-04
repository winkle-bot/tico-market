'use client';

import Link from 'next/link';
import { MapPin, Star, ShieldCheck } from 'lucide-react';
import { categoryEmojis } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import type { Listing } from '@/types';

interface ListingCardProps {
  item: Listing;
}

export function ListingCard({ item }: ListingCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === item.sellerId;

  return (
    <Link
      href={`/listing/${item.id}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative"
    >
      {isOwner && (
        <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
          My Listing
        </div>
      )}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <span className="text-6xl filter drop-shadow-sm transition-transform duration-500 group-hover:scale-125">
              {categoryEmojis[item.category] || '✨'}
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold shadow-sm text-blue-600">
          {item.price}
        </div>

        {item.type === 'driver' && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
            Certified
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>San José, CR</span>
        </div>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
          <div
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/seller/${item.sellerId}`;
            }}
            className="flex items-center gap-2 group/seller cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm group-hover/seller:bg-blue-600 group-hover/seller:text-white transition-all">
              {item.owner[0]}
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover/seller:text-blue-600">
              {item.owner}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg text-orange-600 font-black text-xs">
            <Star className="w-3.5 h-3.5 fill-current" />
            {item.rating}
          </div>
        </div>

        {item.verified && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 w-fit px-2 py-1 rounded-md">
            <ShieldCheck className="w-3 h-3" /> Verified Seller
          </div>
        )}
      </div>
    </Link>
  );
}
