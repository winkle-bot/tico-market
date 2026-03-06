import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { toFrontendListing } from '@/lib/listing-utils';
import type { Listing as DatabaseListing } from '@/lib/supabase-types';

type FeriaRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  waze_link: string | null;
  schedule_text: string | null;
  schedule_days: string[] | null;
  start_time: string | null;
  end_time: string | null;
  next_date: string | null;
  organizer_id: string | null;
  organizer_name: string | null;
  contact_phone: string | null;
  cover_image_url: string | null;
  photos: string[] | null;
  vendor_count: number | null;
  follower_count: number | null;
};

type VendorProfileRow = {
  name: string | null;
  rating: number | null;
  verified: boolean | null;
  bio: string | null;
  location: string | null;
  avg_response_minutes: number | null;
  total_transactions: number | null;
  accepts_delivery: boolean | null;
};

type FeriaVendorRow = {
  id: string;
  vendor_id: string;
  display_name: string | null;
  description: string | null;
  products_summary: string | null;
  profiles: VendorProfileRow | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getFeria(
  supabase: SupabaseServerClient,
  id: string
): Promise<{ data: FeriaRow | null; error: { message: string } | null }> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const feriasTable = supabase.from('ferias') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: FeriaRow | null; error: { message: string } | null }>;
      };
    };
  };

  return feriasTable.select('*').eq(isUuid ? 'id' : 'slug', id).single();
}

async function getApprovedVendors(
  supabase: SupabaseServerClient,
  feriaId: string
): Promise<{ data: FeriaVendorRow[] | null; error: { message: string } | null }> {
  const vendorsTable = supabase.from('feria_vendors') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{ data: FeriaVendorRow[] | null; error: { message: string } | null }>;
      };
    };
  };

  return vendorsTable
    .select('id, vendor_id, display_name, description, products_summary, profiles:vendor_id(name, rating, verified, bio, location, avg_response_minutes, total_transactions, accepts_delivery)')
    .eq('feria_id', feriaId)
    .eq('status', 'approved');
}

async function getFollowerCount(
  supabase: SupabaseServerClient,
  feriaId: string
): Promise<{ count: number | null; error: { message: string } | null }> {
  const followersTable = supabase.from('feria_followers') as unknown as {
    select: (
      columns: string,
      options: { count: 'exact'; head: true }
    ) => {
      eq: (column: string, value: string) => Promise<{ count: number | null; error: { message: string } | null }>;
    };
  };

  return followersTable.select('*', { count: 'exact', head: true }).eq('feria_id', feriaId);
}

async function getFollowState(
  supabase: SupabaseServerClient,
  feriaId: string,
  userId: string
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const followersTable = supabase.from('feria_followers') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  };

  return followersTable.select('id').eq('feria_id', feriaId).eq('user_id', userId).maybeSingle();
}

async function getVendorListings(
  supabase: SupabaseServerClient,
  vendorIds: string[]
): Promise<{ data: DatabaseListing[] | null; error: { message: string } | null }> {
  if (vendorIds.length === 0) {
    return { data: [], error: null };
  }

  const listingsTable = supabase.from('listings') as unknown as {
    select: (columns: string) => {
      in: (column: string, values: string[]) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            config: { ascending: boolean }
          ) => Promise<{ data: DatabaseListing[] | null; error: { message: string } | null }>;
        };
      };
    };
  };

  return listingsTable
    .select('*')
    .in('seller_id', vendorIds)
    .eq('moderation_status', 'active')
    .order('created_at', { ascending: false });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: feria, error } = await getFeria(supabase, id);
    if (error || !feria) {
      return ApiResponse.error('Feria not found', 404);
    }

    const [{ data: vendors, error: vendorsError }, { count: followerCount, error: followerError }] = await Promise.all([
      getApprovedVendors(supabase, feria.id),
      getFollowerCount(supabase, feria.id),
    ]);

    if (vendorsError) {
      return ApiResponse.error(vendorsError.message, 500);
    }
    if (followerError) {
      return ApiResponse.error(followerError.message, 500);
    }

    const vendorIds = (vendors || []).map((vendor) => vendor.vendor_id);
    const { data: listingRows, error: listingError } = await getVendorListings(supabase, vendorIds);
    if (listingError) {
      return ApiResponse.error(listingError.message, 500);
    }

    const listingsByVendor = new Map<string, DatabaseListing[]>();
    for (const listing of listingRows || []) {
      const group = listingsByVendor.get(listing.seller_id) || [];
      group.push(listing);
      listingsByVendor.set(listing.seller_id, group);
    }

    let isFollowing = false;
    if (user) {
      const { data: follower } = await getFollowState(supabase, feria.id, user.id);
      isFollowing = Boolean(follower);
    }

    const storefrontVendors = (vendors || []).map((vendor) => {
      const featuredListings = (listingsByVendor.get(vendor.vendor_id) || [])
        .slice(0, 3)
        .map((listing) => toFrontendListing(listing));

      return {
        id: vendor.id,
        vendor_id: vendor.vendor_id,
        display_name: vendor.display_name,
        description: vendor.description,
        products_summary: vendor.products_summary,
        active_listings_count: (listingsByVendor.get(vendor.vendor_id) || []).length,
        featured_listings: featuredListings,
        profiles: vendor.profiles
          ? {
              name: vendor.profiles.name,
              rating: vendor.profiles.rating,
              verified: vendor.profiles.verified,
              bio: vendor.profiles.bio,
              location: vendor.profiles.location,
              avg_response_minutes: vendor.profiles.avg_response_minutes,
              total_transactions: vendor.profiles.total_transactions,
              accepts_delivery: vendor.profiles.accepts_delivery,
            }
          : null,
      };
    });

    const payload = {
      ...feria,
      schedule_days: feria.schedule_days || [],
      photos: feria.photos || [],
      vendors: storefrontVendors,
      vendor_count: feria.vendor_count ?? storefrontVendors.length,
      follower_count: followerCount || 0,
      is_following: isFollowing,
    };

    if (!user) {
      return ApiResponse.cached(payload);
    }

    return ApiResponse.success(payload);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
