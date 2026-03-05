import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import ListingDetailsClient from './ListingDetailsClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tico-market.com';

import { formatPrice } from '@/lib/format';

type ListingSeoRecord = {
  id: number;
  title: string;
  description: string | null;
  price_cents: number;
  currency: 'CRC' | 'USD';
  category: string;
  image_url: string | null;
  owner: string;
  moderation_status: 'active' | 'hidden';
};

async function getListingForMetadata(id: string): Promise<ListingSeoRecord | null> {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('listings')
    .select('id, title, description, price_cents, currency, category, image_url, owner, moderation_status')
    .eq('id', numericId)
    .single();

  return (data as ListingSeoRecord | null) ?? null;
}

function buildDescription(listing: ListingSeoRecord): string {
  const clean = listing.description?.trim();
  if (clean && clean.length > 0) {
    return clean.slice(0, 160);
  }

  const priceDisplay = formatPrice(listing.price_cents, listing.currency ?? 'CRC');
  return `${listing.category} listing by ${listing.owner} for ${priceDisplay} on Tico Market.`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingForMetadata(id);

  if (!listing) {
    return {
      title: 'Listing Not Found | Tico Market',
      description: 'This listing is not available.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${listing.title} | Tico Market`;
  const description = buildDescription(listing);
  const url = `${SITE_URL}/listing/${listing.id}`;
  const image = listing.image_url || `${SITE_URL}/favicon.ico`;

  return {
    title,
    description,
    alternates: {
      canonical: `/listing/${listing.id}`,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Tico Market',
      type: 'website',
      images: [
        {
          url: image,
          alt: listing.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots:
      listing.moderation_status === 'active'
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingDetailsClient listingId={id} />;
}
