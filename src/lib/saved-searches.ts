import type { Listing } from '@/lib/supabase-types';

export type SavedSearchCriteria = {
  query?: string | null;
  categories?: string[] | null;
  listingKind?: 'seller' | 'driver' | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'distance' | null;
};

export type SavedSearchRecord = SavedSearchCriteria & {
  id: string;
  userId: string;
  name: string;
  alertEnabled: boolean;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeQuery(query?: string | null) {
  return query?.trim().toLowerCase() || '';
}

function normalizeCategories(categories?: string[] | null) {
  return Array.from(
    new Set(
      (categories || [])
        .map((category) => category.trim())
        .filter(Boolean)
    )
  ).sort();
}

export function normalizeSavedSearchCriteria(criteria: SavedSearchCriteria) {
  return {
    query: normalizeQuery(criteria.query),
    categories: normalizeCategories(criteria.categories),
    listingKind:
      criteria.listingKind === 'seller' || criteria.listingKind === 'driver'
        ? criteria.listingKind
        : null,
    minPrice: Number.isFinite(criteria.minPrice) ? Number(criteria.minPrice) : null,
    maxPrice: Number.isFinite(criteria.maxPrice) ? Number(criteria.maxPrice) : null,
    sort:
      criteria.sort === 'price_asc' ||
      criteria.sort === 'price_desc' ||
      criteria.sort === 'distance' ||
      criteria.sort === 'newest'
        ? criteria.sort
        : 'newest',
  };
}

export function buildSavedSearchFingerprint(criteria: SavedSearchCriteria) {
  return JSON.stringify(normalizeSavedSearchCriteria(criteria));
}

export function buildSavedSearchName(criteria: SavedSearchCriteria) {
  const normalized = normalizeSavedSearchCriteria(criteria);

  if (normalized.query) {
    return normalized.query.slice(0, 80);
  }

  if (normalized.categories.length > 0) {
    return normalized.categories.join(', ').slice(0, 80);
  }

  if (normalized.listingKind) {
    return normalized.listingKind === 'driver' ? 'Driver search' : 'Listing search';
  }

  return 'Saved search';
}

export function toSavedSearchResponse(row: Record<string, unknown>): SavedSearchRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    query: typeof row.query_text === 'string' ? row.query_text : null,
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
    listingKind:
      row.listing_kind === 'seller' || row.listing_kind === 'driver'
        ? row.listing_kind
        : null,
    minPrice: typeof row.min_price === 'number' ? row.min_price : null,
    maxPrice: typeof row.max_price === 'number' ? row.max_price : null,
    sort:
      row.sort === 'price_asc' ||
      row.sort === 'price_desc' ||
      row.sort === 'distance' ||
      row.sort === 'newest'
        ? row.sort
        : 'newest',
    alertEnabled: Boolean(row.alert_enabled ?? true),
    fingerprint: String(row.fingerprint),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function matchesSavedSearch(listing: Listing, criteria: SavedSearchCriteria) {
  const normalized = normalizeSavedSearchCriteria(criteria);
  const haystack = `${listing.title} ${listing.description || ''}`.toLowerCase();

  if (normalized.query && !haystack.includes(normalized.query)) {
    return false;
  }

  if (normalized.categories.length > 0 && !normalized.categories.includes(listing.category)) {
    return false;
  }

  if (normalized.listingKind && listing.listing_kind !== normalized.listingKind) {
    return false;
  }

  const priceCents = listing.price_cents ?? 0;
  if (normalized.minPrice !== null && priceCents < normalized.minPrice) {
    return false;
  }

  if (normalized.maxPrice !== null && priceCents > normalized.maxPrice) {
    return false;
  }

  return true;
}
