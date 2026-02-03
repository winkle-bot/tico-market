"use client";

import React from 'react';

export function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-5">
        <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-6 bg-gray-200 rounded-lg w-12" />
        </div>
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white pt-20 pb-24 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Skeleton */}
          <div className="aspect-square bg-gray-200 rounded-[40px]" />
          
          {/* Info Skeleton */}
          <div className="flex flex-col">
            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-24" />
              <div className="h-6 bg-gray-200 rounded-full w-16" />
            </div>
            <div className="h-12 bg-gray-200 rounded-lg w-3/4 mb-4" />
            <div className="h-10 bg-gray-200 rounded-lg w-1/3 mb-6" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            
            {/* Seller Card Skeleton */}
            <div className="bg-gray-100 rounded-3xl p-6 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div>
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 h-16 bg-gray-200 rounded-2xl" />
                <div className="flex-1 h-16 bg-gray-200 rounded-2xl" />
              </div>
            </div>
            
            {/* Description Skeleton */}
            <div className="mb-8">
              <div className="h-3 bg-gray-200 rounded w-24 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <div className="h-5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
