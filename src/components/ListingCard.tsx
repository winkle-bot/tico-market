'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, ShieldCheck, ImageIcon, Clock } from 'lucide-react';
import { categoryEmojis } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, formatCondition } from '@/lib/format';
import type { Listing } from '@/types';

interface ListingCardProps {
  item: Listing;
}

export const ListingCard = React.memo(function ListingCard({ item }: ListingCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === item.sellerId;

  const displayPrice = item.itemType === 'free'
    ? 'Free'
    : formatPrice(item.priceCents, item.currency, item.price);

  const imageCount = item.imageUrls?.length || (item.imageUrl ? 1 : 0);

  // Check if expiring within 5 days (show to owner only)
  const isExpiringSoon = isOwner && item.expiresAt
    ? new Date(item.expiresAt).getTime() - Date.now() < 5 * 24 * 60 * 60 * 1000
    : false;

  return (
    <article className="tm-card overflow-hidden transition-all duration-300 group relative tm-raise">
      {isOwner && (
        <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
          My Listing
        </div>
      )}
      {isExpiringSoon && (
        <div className="absolute top-3 left-3 z-10 mt-7 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
          <Clock className="w-3 h-3" /> Expiring Soon
        </div>
      )}
      <Link href={`/listing/${item.id}`} className="block cursor-pointer">
        <div className="aspect-square bg-[#f1f5ff] relative overflow-hidden">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#eaf1ff] via-[#e5f4ff] to-[#f0ebff] flex items-center justify-center">
              <span className="text-6xl filter drop-shadow-sm transition-transform duration-500 group-hover:scale-125">
                {categoryEmojis[item.category] || '✨'}
              </span>
            </div>
          )}

          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-black shadow-sm text-blue-700 border border-white/70">
            {displayPrice}
          </div>

          {imageCount > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> {imageCount}
            </div>
          )}

          {item.listingKind === 'driver' && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Certified
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="font-bold text-[1.02rem] text-[#18284a] line-clamp-1 mb-1 group-hover:text-blue-700 transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#748ab5] mb-2 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>GAM, Costa Rica</span>
          </div>

          {item.condition && item.condition !== 'good' && (
            <div className="flex gap-1.5 mb-3">
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {formatCondition(item.condition)}
              </span>
            </div>
          )}

        </div>
      </Link>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5 -mt-1">
        <div className="pt-3 border-t border-[#edf2ff] flex items-center justify-between gap-3">
          <Link
            href={`/seller/${item.sellerId}`}
            className="flex items-center gap-2 group/seller min-h-10 pr-2 min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm group-hover/seller:bg-blue-600 group-hover/seller:text-white transition-all shrink-0">
              {item.owner[0]}
            </div>
            <span className="text-sm font-bold text-[#3a578f] group-hover/seller:text-blue-700 truncate">
              {item.owner}
            </span>
          </Link>

          <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1.5 rounded-lg text-orange-600 font-black text-xs shrink-0">
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
    </article>
  );
});
