import type { MetadataRoute } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tico-market.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/account`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ];

  try {
    const supabase = await createSupabaseServerClient();

    const [{ data: listings }, { data: sellers }] = await Promise.all([
      supabase
        .from('listings')
        .select('id, updated_at')
        .eq('moderation_status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('profiles')
        .select('id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5000),
    ]);

    const listingRoutes: MetadataRoute.Sitemap = (listings || []).map((listing: any) => ({
      url: `${SITE_URL}/listing/${listing.id}`,
      lastModified: listing.updated_at ? new Date(listing.updated_at) : now,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const sellerRoutes: MetadataRoute.Sitemap = (sellers || []).map((seller: any) => ({
      url: `${SITE_URL}/seller/${seller.id}`,
      lastModified: seller.updated_at ? new Date(seller.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...listingRoutes, ...sellerRoutes];
  } catch {
    return staticRoutes;
  }
}
