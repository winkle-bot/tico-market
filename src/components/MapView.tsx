'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { categoryEmojis } from '@/lib/data';
import { MAP_CENTER, MAP_DEFAULT_ZOOM } from '@/config/constants';
import type { Listing } from '@/types';

// Dynamic imports for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface MapViewProps {
  items: Listing[];
}

export function MapView({ items }: MapViewProps) {
  return (
    <div className="h-full w-full">
      {typeof window !== 'undefined' && (
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {items.map((item) => (
            <Marker key={item.id} position={item.location}>
              <Popup className="custom-popup">
                <div className="p-2 min-w-[220px]">
                  {/* Thumbnail */}
                  <div className="w-full h-28 rounded-xl overflow-hidden mb-3 bg-gray-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                        <span className="text-3xl">
                          {categoryEmojis[item.category] || '✨'}
                        </span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-black text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-blue-600 font-black text-lg mb-2">
                    {item.price}
                  </p>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                      Rating: {item.rating} ⭐
                    </span>
                  </div>
                  <Link
                    href={`/listing/${item.id}`}
                    className="block w-full bg-blue-600 text-white text-[10px] py-2.5 rounded-lg text-center uppercase font-black tracking-widest hover:bg-blue-700 transition-colors mt-2"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/seller/${item.sellerId}`}
                    className="block w-full bg-black text-white text-[10px] py-2.5 rounded-lg text-center uppercase font-black tracking-widest hover:bg-blue-600 transition-colors mt-1"
                  >
                    View Seller Profile
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
