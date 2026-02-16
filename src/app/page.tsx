'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import {
  Navbar,
  FilterBar,
  ListingCard,
  MapView,
  AuthModal,
  SellModal,
  MobileMenu,
  ListingGridSkeleton,
} from '@/components';
import { BottomNav } from '@/components/BottomNav';
import { API_ROUTES } from '@/config/constants';
import { useI18n } from '@/context/I18nContext';
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
  const { t } = useI18n();
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
  const [onlineDriversCount, setOnlineDriversCount] = useState(0);

  // Modal state
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
    const fetchOnlineDriversCount = async () => {
      try {
        const res = await fetch(`${API_ROUTES.DRIVERS}?online=true`);
        if (!res.ok) return;
        const payload = await res.json();
        setOnlineDriversCount(Array.isArray(payload?.data) ? payload.data.length : 0);
      } catch {
        setOnlineDriversCount(0);
      }
    };
    fetchOnlineDriversCount();
  }, []);

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

      <main id="main-content" className="flex-1 flex flex-col pb-16 md:pb-0">
        <FilterBar
          view={view}
          onViewChange={setView}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setSelectedCategories([])}
        />

        <div className="bg-white/90 backdrop-blur-lg border-b border-[#dce5f7] px-4 py-3">
          <div className="tm-shell flex items-center justify-between gap-3">
            <p className="text-sm text-[#6780b3] font-semibold">
              {pagination.total === 1
                ? t('home.listingsFoundSingular', '1 listing found')
                : t('home.listingsFoundPlural', `${pagination.total} listings found`).replace('{count}', String(pagination.total))}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
              className="tm-input w-auto min-h-10 text-sm"
              aria-label="Sort listings"
            >
              <option value="newest">{t('home.sortNewest', 'Newest')}</option>
              <option value="price_asc">{t('home.sortPriceAsc', 'Price: Low to high')}</option>
              <option value="price_desc">{t('home.sortPriceDesc', 'Price: High to low')}</option>
            </select>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-[#dce5f7] bg-gradient-to-r from-[#e9f0ff] via-[#f5f8ff] to-[#ecf6ff]">
          <div className="tm-shell">
            <div className="rounded-2xl bg-white/90 border border-[#dce5f7] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#6b84b3]">
                  {t('home.deliveryMarketplace')}
                </p>
                <h2 className="text-lg sm:text-xl font-black text-[#18284a] mt-1">
                  {t('home.expressCardTitle')}
                </h2>
                <p className="text-sm text-[#5d739f] mt-1">
                  {t('home.nearbyDriversCount', `${onlineDriversCount} drivers online`).replace('{count}', String(onlineDriversCount))}
                </p>
              </div>
              <Link href="/delivery" className="tm-btn tm-btn-primary">
                {t('home.openDelivery')}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-[#f5f8ff]/80">
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
                className="tm-shell py-4 md:py-8"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                      {listings.map((item) => (
                        <ListingCard key={item.id} item={item} />
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={!pagination.hasPrevPage}
                        className="tm-btn tm-btn-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('home.previous', 'Previous')}
                      </button>
                      <span className="text-sm text-[#6e84b1] font-semibold px-2">
                        {t('home.pageOf', `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)}`).replace('{current}', String(pagination.page)).replace('{total}', String(Math.max(1, pagination.totalPages)))}
                      </span>
                      <button
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={!pagination.hasNextPage}
                        className="tm-btn tm-btn-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('home.next', 'Next')}
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

      <BottomNav
        onSell={() => setIsSellModalOpen(true)}
        onAuth={() => setIsAuthModalOpen(true)}
      />
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
  const { t } = useI18n();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {error ? t('home.unableToLoad', 'Unable to load listings') : t('home.noListingsFound', 'No listings found')}
      </h3>
      <p className="text-gray-500 font-medium max-w-md">
        {error
          ? error
          : searchQuery
          ? t('home.noResultsFor', `No results for "${searchQuery}"`).replace('{query}', searchQuery)
          : t('home.noListingsMatchFilters', 'No listings match the selected filters')}
      </p>
      {hasFilters && !error && (
        <button
          onClick={onClearFilters}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
        >
          {t('home.clearFilters', 'Clear Filters')}
        </button>
      )}
    </div>
  );
}
