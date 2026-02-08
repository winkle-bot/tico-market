import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import SellerProfileClient from './SellerProfileClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tico-market.com';

type SellerSeoRecord = {
  id: string;
  name: string;
  bio: string | null;
  location: string | null;
  verified: boolean;
  rating: number;
};

async function getSellerForMetadata(id: string): Promise<SellerSeoRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, bio, location, verified, rating')
    .eq('id', id)
    .single();

  return (data as SellerSeoRecord | null) ?? null;
}

function buildDescription(seller: SellerSeoRecord): string {
  const cleanBio = seller.bio?.trim();
  if (cleanBio && cleanBio.length > 0) {
    return cleanBio.slice(0, 160);
  }

  const location = seller.location ? `${seller.location}, Costa Rica` : 'Costa Rica';
  return `${seller.name} is a ${seller.verified ? 'verified ' : ''}seller in ${location} on Tico Market.`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSellerForMetadata(id);

  if (!seller) {
    return {
      title: 'Seller Not Found | Tico Market',
      description: 'This seller profile is not available.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${seller.name} | Seller on Tico Market`;
  const description = buildDescription(seller);
  const url = `${SITE_URL}/seller/${seller.id}`;
  const image = `${SITE_URL}/favicon.ico`;

  return {
    title,
    description,
    alternates: {
      canonical: `/seller/${seller.id}`,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Tico Market',
      type: 'profile',
      images: [
        {
          url: image,
          alt: `${seller.name} on Tico Market`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerProfileClient sellerId={id} />;
}
