'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/config/constants';
import type { Listing } from '@/types';

interface ListingsContextType {
  listings: Listing[];
  isLoading: boolean;
  error: string | null;
  refreshListings: () => Promise<void>;
  addListing: (listing: Listing) => void;
  updateListing: (listing: Listing) => void;
  deleteListing: (id: number) => void;
}

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(API_ROUTES.LISTINGS);
      if (!res.ok) throw new Error('Failed to fetch listings');
      
      const data = await res.json();
      setListings(data);
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      setError(err.message || 'Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshListings();
  }, [refreshListings]);

  const addListing = useCallback((listing: Listing) => {
    setListings((prev) => [listing, ...prev]);
  }, []);

  const updateListing = useCallback((updated: Listing) => {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const deleteListing = useCallback((id: number) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <ListingsContext.Provider
      value={{
        listings,
        isLoading,
        error,
        refreshListings,
        addListing,
        updateListing,
        deleteListing,
      }}
    >
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (context === undefined) {
    throw new Error('useListings must be used within a ListingsProvider');
  }
  return context;
}
