'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import type { Listing } from '@/types';

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

interface ListingLocationMapProps {
  listing: Listing;
}

function isValidLatLng(location: [number, number] | undefined): location is [number, number] {
  if (!location) return false;
  const [lat, lng] = location;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function ListingLocationMap({ listing }: ListingLocationMapProps) {
  if (!isValidLatLng(listing.location)) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center text-center p-6">
        <div>
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">Location is not available for this listing.</p>
        </div>
      </div>
    );
  }

  const [lat, lng] = listing.location;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="h-full w-full">
      {typeof window !== 'undefined' && (
        <MapContainer
          center={listing.location}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={listing.location}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-gray-900 mb-1">{listing.title}</p>
                <p className="text-sm text-blue-600 font-semibold mb-2">{listing.price}</p>
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline"
                >
                  Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      )}
    </div>
  );
}
