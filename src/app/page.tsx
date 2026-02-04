'use client';

import React, { useState, useEffect } from 'react';
import { Search, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Navbar,
  FilterBar,
  ListingCard,
  MapView,
  AuthModal,
  BookingModal,
  SellModal,
  MobileMenu,
  ListingGridSkeleton,
} from '@/components';
import { API_ROUTES } from '@/config/constants';
import type { Listing, Category, AuthFormState } from '@/types';

export default function Home() {
  // View state
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Data state
  const [localListings, setLocalListings] = useState<Listing[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(true);

  // Modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState<AuthFormState>({
    email: '',
    password: '',
    name: '',
  });

  // Fetch listings on mount
  useEffect(() => {
    setIsListingsLoading(true);
    fetch(API_ROUTES.LISTINGS)
      .then((res) => res.json())
      .then((data) => setLocalListings(data))
      .finally(() => setIsListingsLoading(false));
  }, []);

  // Filter listings by search query and selected categories
  const filteredListings = localListings.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(item.category);

    return matchesSearch && matchesCategory;
  });

  // Get drivers for booking modal
  const drivers = localListings.filter((l) => l.type === 'driver');

  // Category toggle handler
  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Handle new listing created
  const handleListingCreated = (listing: Listing) => {
    setLocalListings([listing, ...localListings]);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        formState={authForm}
        onFormChange={setAuthForm}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        drivers={drivers}
      />

      <SellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onListingCreated={handleListingCreated}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        {/* Toggle & Filter Bar */}
        <FilterBar
          view={view}
          onViewChange={setView}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setSelectedCategories([])}
        />

        {/* Content Area */}
        <div className="flex-1 relative bg-gray-50/50">
          <AnimatePresence mode="wait">
            {isListingsLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ListingGridSkeleton count={8} />
              </motion.div>
            ) : view === 'list' ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredListings.length > 0 ? (
                  filteredListings.map((item) => (
                    <ListingCard key={item.id} item={item} />
                  ))
                ) : (
                  <EmptyState
                    searchQuery={searchQuery}
                    hasFilters={
                      searchQuery !== '' || selectedCategories.length > 0
                    }
                    onClearFilters={clearFilters}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-0"
              >
                <MapView items={filteredListings} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action for Drivers */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 transform active:scale-95"
          aria-label="Book express delivery"
        >
          <Truck className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-bold uppercase tracking-wider text-xs">
            Find Express Delivery
          </span>
        </button>
      </div>
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  searchQuery: string;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ searchQuery, hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No listings found</h3>
      <p className="text-gray-500 font-medium max-w-md">
        {searchQuery
          ? `No results for "${searchQuery}"`
          : 'No listings match the selected filters'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
