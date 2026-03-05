'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Users, ChevronLeft, Heart } from 'lucide-react';
import { SimpleNav } from '@/components/SimpleNav';
import { useI18n } from '@/context/I18nContext';

interface Feria {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  waze_link: string | null;
  schedule_text: string | null;
  next_date: string | null;
  cover_image_url: string | null;
  vendor_count: number;
  follower_count: number;
  is_active: boolean;
}

export default function FeriasPage() {
  const { t } = useI18n();
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch('/api/ferias')
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => {
        setFerias(Array.isArray(data) ? data : []);
        setFetchError(false);
      })
      .catch(() => {
        setFerias([]);
        setFetchError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <SimpleNav />
      <main className="pt-20 pb-12">
        <div className="tm-shell">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-white rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{t('ferias.title', 'Ferias')}</h1>
              <p className="text-sm text-gray-500 font-medium">{t('ferias.subtitle', "Farmer's markets and local events across Costa Rica")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-100" />
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('ferias.loadError', 'Could not load ferias')}</h3>
              <p className="text-gray-500 mb-6">{t('ferias.loadErrorDescription', 'Please check your connection and try again.')}</p>
              <button onClick={() => window.location.reload()} className="tm-btn tm-btn-primary">
                {t('common.tryAgain', 'Try Again')}
              </button>
            </div>
          ) : ferias.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('ferias.noFerias', 'No ferias listed yet')}</h3>
              <p className="text-gray-500 mb-6">{t('ferias.beFirst', 'Be the first to add your local feria!')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ferias.map((feria) => (
                <Link
                  key={feria.id}
                  href={`/ferias/${feria.slug}`}
                  className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="h-48 bg-gradient-to-br from-green-50 to-orange-50 relative overflow-hidden">
                    {feria.cover_image_url ? (
                      <Image
                        src={feria.cover_image_url}
                        alt={feria.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-7xl">🥬</span>
                      </div>
                    )}
                    {feria.schedule_text && (
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {feria.schedule_text}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-lg text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
                      {feria.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      {feria.location_name}
                    </div>
                    {feria.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{feria.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {feria.vendor_count} {t('ferias.vendors', 'vendors')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> {feria.follower_count} {t('ferias.followers', 'followers')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
