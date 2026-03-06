'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Users, ChevronLeft, Heart, ExternalLink, Clock, ShieldCheck, Star } from 'lucide-react';
import { SimpleNav } from '@/components/SimpleNav';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useToast } from '@/context/ToastContext';
import { withCsrfHeaders } from '@/lib/csrf';
import { enqueueJsonMutation, isOfflineMutationError } from '@/lib/offline-queue';
import { formatResponseTime } from '@/lib/format';

interface FeriaVendorListing {
  id: number;
  title: string;
  price: string;
  imageUrl?: string | null;
  category: string;
  pickupConfig?: {
    leadTime?: string;
    marketEvents?: Array<{ id: string; name: string }>;
  };
  fulfillmentOptions?: {
    pickup?: boolean;
    platform_delivery?: boolean;
  };
}

interface FeriaVendor {
  id: string;
  vendor_id: string;
  display_name: string | null;
  description: string | null;
  products_summary: string | null;
  active_listings_count: number;
  featured_listings: FeriaVendorListing[];
  profiles?: {
    name: string | null;
    rating: number | null;
    verified: boolean | null;
    bio: string | null;
    location: string | null;
    avg_response_minutes: number | null;
    total_transactions: number | null;
    accepts_delivery: boolean | null;
  } | null;
}

interface FeriaDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  waze_link: string | null;
  schedule_text: string | null;
  schedule_days: string[];
  start_time: string | null;
  end_time: string | null;
  next_date: string | null;
  organizer_id: string | null;
  organizer_name: string | null;
  contact_phone: string | null;
  cover_image_url: string | null;
  photos: string[];
  vendor_count: number;
  follower_count: number;
  is_following?: boolean;
  vendors: FeriaVendor[];
}

export default function FeriaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const { locale } = useI18n();
  const toast = useToast();
  const [feria, setFeria] = useState<FeriaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<'not_found' | 'error' | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/ferias/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setFetchError('not_found');
          return null;
        }
        if (!res.ok) {
          setFetchError('error');
          return null;
        }
        setFetchError(null);
        return res.json();
      })
      .then((data) => setFeria(data))
      .catch(() => {
        setFeria(null);
        setFetchError('error');
      })
      .finally(() => setIsLoading(false));
  }, [slug, user?.id]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow ferias');
      return;
    }
    if (!feria || followLoading) {
      return;
    }

    const nextFollowing = !feria.is_following;
    const previousFollowerCount = feria.follower_count;
    const optimisticFollowerCount = Math.max(
      0,
      previousFollowerCount + (nextFollowing ? 1 : -1)
    );

    setFollowLoading(true);
    setFeria((current) => (
      current
        ? {
            ...current,
            is_following: nextFollowing,
            follower_count: optimisticFollowerCount,
          }
        : current
    ));

    try {
      const queueKey = `feria-follow:${feria.slug}`;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueJsonMutation({
          url: `/api/ferias/${feria.slug}/follow`,
          method: nextFollowing ? 'POST' : 'DELETE',
          queueKey,
        });
        toast.success(nextFollowing ? 'Feria follow queued' : 'Feria unfollow queued');
        return;
      }

      const response = await fetch(`/api/ferias/${feria.slug}/follow`, {
        method: nextFollowing ? 'POST' : 'DELETE',
        headers: withCsrfHeaders(),
      });

      const payload = await response.json().catch(() => ({} as { error?: string; followerCount?: number; isFollowing?: boolean }));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update feria follow status');
      }

      setFeria((current) => (
        current
          ? {
              ...current,
              is_following: payload.isFollowing ?? nextFollowing,
              follower_count: payload.followerCount ?? optimisticFollowerCount,
            }
          : current
      ));

      toast.success(nextFollowing ? 'Feria followed' : 'Feria unfollowed');
    } catch (error) {
      if (isOfflineMutationError(error)) {
        await enqueueJsonMutation({
          url: `/api/ferias/${feria.slug}/follow`,
          method: nextFollowing ? 'POST' : 'DELETE',
          queueKey: `feria-follow:${feria.slug}`,
        });
        toast.success(nextFollowing ? 'Feria follow queued' : 'Feria unfollow queued');
        return;
      }

      setFeria((current) => (
        current
          ? {
              ...current,
              is_following: !nextFollowing,
              follower_count: previousFollowerCount,
            }
          : current
      ));
      toast.error(error instanceof Error ? error.message : 'Could not update feria follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f8ff]">
        <SimpleNav />
        <main className="pt-20 pb-12">
          <div className="tm-shell animate-pulse space-y-6">
            <div className="h-64 bg-gray-100 rounded-3xl" />
            <div className="h-10 bg-gray-100 rounded w-1/2" />
            <div className="h-6 bg-gray-100 rounded w-1/3" />
          </div>
        </main>
      </div>
    );
  }

  if (!feria) {
    return (
      <div className="min-h-screen bg-[#f5f8ff]">
        <SimpleNav />
        <main className="pt-20 pb-12 text-center">
          <div className="tm-shell">
            {fetchError === 'error' ? (
              <>
                <h1 className="text-2xl font-black text-gray-900 mb-4">Could not load feria</h1>
                <p className="text-gray-500 mb-4">Please check your connection and try again.</p>
                <button onClick={() => window.location.reload()} className="tm-btn tm-btn-primary mb-4">
                  Try Again
                </button>
              </>
            ) : (
              <h1 className="text-2xl font-black text-gray-900 mb-4">Feria Not Found</h1>
            )}
            <Link href="/ferias" className="text-blue-600 font-bold hover:underline">
              Browse all ferias
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <SimpleNav />
      <main className="pt-20 pb-12">
        <div className="tm-shell">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/ferias" className="p-2 hover:bg-white rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Feria</span>
          </div>

          {/* Cover Image */}
          <div className="h-64 md:h-80 bg-gradient-to-br from-green-50 to-orange-50 rounded-3xl overflow-hidden relative mb-8">
            {feria.cover_image_url ? (
              <Image
                src={feria.cover_image_url}
                alt={feria.name}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-9xl">🥬</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">{feria.name}</h1>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600">
                    <MapPin className="w-4 h-4 text-green-600" /> {feria.location_name}
                  </span>
                  {feria.schedule_text && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600">
                      <Calendar className="w-4 h-4 text-orange-500" /> {feria.schedule_text}
                    </span>
                  )}
                  {feria.start_time && feria.end_time && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600">
                      <Clock className="w-4 h-4 text-blue-500" /> {feria.start_time} - {feria.end_time}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${feria.is_following
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                  >
                    <Heart className={`w-4 h-4 ${feria.is_following ? 'fill-current' : ''}`} />
                    {followLoading ? 'Saving...' : feria.is_following ? 'Following' : 'Follow'}
                  </button>
                  {feria.waze_link && (
                    <a
                      href={feria.waze_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open in Waze
                    </a>
                  )}
                </div>
              </div>

              {feria.description && (
                <div>
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">About</h2>
                  <p className="text-gray-600 leading-relaxed">{feria.description}</p>
                </div>
              )}

              {/* Vendors */}
              <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Vendor Storefronts ({feria.vendors.length})
                </h2>
                {feria.vendors.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No vendors registered yet</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {feria.vendors.map((vendor) => (
                      <article
                        key={vendor.id}
                        className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl shrink-0">
                              {(vendor.display_name || vendor.profiles?.name || '?')[0]}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xl font-black text-gray-900">
                                  {vendor.display_name || vendor.profiles?.name || 'Vendor'}
                                </h4>
                                {vendor.profiles?.verified && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-600">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                  </span>
                                )}
                                {vendor.profiles?.rating ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-orange-600">
                                    <Star className="w-3.5 h-3.5 fill-current" /> {vendor.profiles.rating.toFixed(1)}
                                  </span>
                                ) : null}
                              </div>
                              {(vendor.products_summary || vendor.description || vendor.profiles?.bio) && (
                                <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-2xl">
                                  {vendor.products_summary || vendor.description || vendor.profiles?.bio}
                                </p>
                              )}
                              {vendor.profiles?.location && (
                                <p className="mt-2 text-xs font-semibold text-gray-500">
                                  Based in {vendor.profiles.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[380px]">
                            <div className="rounded-2xl bg-[#f5f8ff] px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#6f83ad]">Listings</p>
                              <p className="mt-1 text-lg font-black text-[#18284a]">{vendor.active_listings_count}</p>
                            </div>
                            <div className="rounded-2xl bg-[#f5f8ff] px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#6f83ad]">Response</p>
                              <p className="mt-1 text-sm font-bold text-[#18284a]">
                                {vendor.profiles?.avg_response_minutes
                                  ? formatResponseTime(vendor.profiles.avg_response_minutes)
                                  : 'New vendor'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[#f5f8ff] px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#6f83ad]">Orders</p>
                              <p className="mt-1 text-lg font-black text-[#18284a]">
                                {vendor.profiles?.total_transactions || 0}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[#f5f8ff] px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#6f83ad]">Delivery</p>
                              <p className="mt-1 text-sm font-bold text-[#18284a]">
                                {vendor.profiles?.accepts_delivery === false ? 'Pickup only' : 'Pickup + delivery'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {vendor.description && vendor.products_summary && vendor.description !== vendor.products_summary && (
                          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                            {vendor.description}
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                            Featured Listings
                          </h5>
                          <Link
                            href={`/seller/${vendor.vendor_id}`}
                            className="text-sm font-bold text-green-700 hover:text-green-800"
                          >
                            View storefront
                          </Link>
                        </div>

                        {vendor.featured_listings.length === 0 ? (
                          <div className="mt-3 rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                            This vendor has not published feria-ready listings yet.
                          </div>
                        ) : (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {vendor.featured_listings.map((listing) => (
                              <Link
                                key={listing.id}
                                href={`/listing/${listing.id}`}
                                className="rounded-2xl border border-gray-100 overflow-hidden hover:border-green-200 hover:shadow-sm transition-all group"
                              >
                                <div className="relative h-36 bg-gradient-to-br from-green-50 to-orange-50">
                                  {listing.imageUrl ? (
                                    <Image
                                      src={listing.imageUrl}
                                      alt={listing.title}
                                      fill
                                      sizes="(min-width: 768px) 33vw, 100vw"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">
                                      🥕
                                    </div>
                                  )}
                                </div>
                                <div className="p-3">
                                  <h6 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">
                                    {listing.title}
                                  </h6>
                                  <p className="mt-1 text-green-700 font-black">{listing.price}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {listing.fulfillmentOptions?.pickup && (
                                      <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">
                                        Pickup
                                      </span>
                                    )}
                                    {listing.fulfillmentOptions?.platform_delivery && (
                                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                                        Delivery
                                      </span>
                                    )}
                                    {listing.pickupConfig?.leadTime && (
                                      <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                                        {listing.pickupConfig.leadTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendors</span>
                    <span className="font-bold text-gray-900">{feria.vendor_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Followers</span>
                    <span className="font-bold text-gray-900">{feria.follower_count}</span>
                  </div>
                  {feria.organizer_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Organizer</span>
                      <span className="font-bold text-gray-900">{feria.organizer_name}</span>
                    </div>
                  )}
                  {feria.next_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Date</span>
                      <span className="font-bold text-gray-900">
                        {new Date(feria.next_date).toLocaleDateString(locale === 'es' ? 'es-CR' : 'en-US')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {feria.contact_phone && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Contact</h3>
                  <a
                    href={`tel:${feria.contact_phone}`}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    {feria.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
