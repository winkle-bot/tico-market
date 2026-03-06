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

interface FeriaVendor {
  id: string;
  vendor_id: string;
  display_name: string | null;
  description: string | null;
  products_summary: string | null;
  profiles?: { name: string; rating: number; verified: boolean };
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
                  Vendors ({feria.vendors.length})
                </h2>
                {feria.vendors.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No vendors registered yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {feria.vendors.map((vendor) => (
                      <Link
                        key={vendor.id}
                        href={`/seller/${vendor.vendor_id}`}
                        className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                            {(vendor.display_name || vendor.profiles?.name || '?')[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                              {vendor.display_name || vendor.profiles?.name || 'Vendor'}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {vendor.profiles?.verified && (
                                <span className="flex items-center gap-0.5 text-blue-600">
                                  <ShieldCheck className="w-3 h-3" /> Verified
                                </span>
                              )}
                              {vendor.profiles?.rating && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-orange-500 fill-current" /> {vendor.profiles.rating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {vendor.products_summary && (
                          <p className="text-sm text-gray-500 line-clamp-2">{vendor.products_summary}</p>
                        )}
                      </Link>
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
