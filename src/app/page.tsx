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

interface ListingsApiResponse {
  data: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const PAGE_LIMIT = 24;

export default function Home() {
  // View/filter state
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [page, setPage] = useState(1);

  // Listings data
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

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

  // Drivers for booking modal
  const [drivers, setDrivers] = useState<Listing[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategories, sort]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsListingsLoading(true);
        setListingsError(null);

        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_LIMIT),
          sort,
        });

        if (debouncedSearch) {
          params.set('q', debouncedSearch);
        }

        selectedCategories.forEach((category) => {
          params.append('category', category);
        });

        const res = await fetch(`${API_ROUTES.LISTINGS}?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch listings');
        }

        const payload = (await res.json()) as ListingsApiResponse;
        setListings(payload.data || []);
        if (payload.pagination) {
          setPagination(payload.pagination);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listings';
        setListingsError(message);
        setListings([]);
      } finally {
        setIsListingsLoading(false);
      }
    };

    fetchListings();
  }, [page, debouncedSearch, selectedCategories, sort]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch(`${API_ROUTES.LISTINGS}?type=driver&page=1&limit=40&sort=newest`);
        if (!res.ok) return;

        const payload = await res.json();
        if (payload && Array.isArray(payload.data)) {
          setDrivers(payload.data);
        } else if (Array.isArray(payload)) {
          setDrivers(payload.filter((listing: Listing) => listing.type === 'driver'));
        }
      } catch {
        setDrivers([]);
      }
    };

    fetchDrivers();
  }, []);

  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleListingCreated = (listing: Listing) => {
    if (page === 1) {
      setListings((prev) => [listing, ...prev].slice(0, PAGE_LIMIT));
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
      }));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategories([]);
    setSort('newest');
    setPage(1);
  };

  const hasFilters = debouncedSearch !== '' || selectedCategories.length > 0 || sort !== 'newest';

  return (
    <div className="min-h-screen flex flex-col">
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

      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        <FilterBar
          view={view}
          onViewChange={setView}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setSelectedCategories([])}
        />

        <div className="bg-white border-b px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">
              {pagination.total} listing{pagination.total === 1 ? '' : 's'} found
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label="Sort listings"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
            </select>
          </div>
        </div>

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
                className="max-w-7xl mx-auto p-4 md:p-8"
              >
                {listingsError ? (
                  <EmptyState
                    searchQuery={debouncedSearch}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    error={listingsError}
                  />
                ) : listings.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {listings.map((item) => (
                        <ListingCard key={item.id} item={item} />
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={!pagination.hasPrevPage}
                        className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500 font-medium">
                        Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                      </span>
                      <button
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={!pagination.hasNextPage}
                        className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    searchQuery={debouncedSearch}
                    hasFilters={hasFilters}
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
                <MapView items={listings} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

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

interface EmptyStateProps {
  searchQuery: string;
  hasFilters: boolean;
  onClearFilters: () => void;
  error?: string;
}

function EmptyState({ searchQuery, hasFilters, onClearFilters, error }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {error ? 'Unable to load listings' : 'No listings found'}
      </h3>
      <p className="text-gray-500 font-medium max-w-md">
        {error
          ? error
          : searchQuery
          ? `No results for "${searchQuery}"`
          : 'No listings match the selected filters'}
      </p>
      {hasFilters && !error && (
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
