"use client";

import React, { useState } from 'react';
import { Search, MapPin, Star, Truck, Menu, PlusCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { listings } from '@/lib/data';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function Home() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600 tracking-tight">TicoMarket</span>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search in Costa Rica..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="hidden sm:flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium">
                <PlusCircle className="w-5 h-5" /> Sell
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <User className="w-6 h-6" />
              </button>
              <button className="md:hidden p-2">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {/* Toggle & Filter Bar */}
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                List View
              </button>
              <button 
                onClick={() => setView('map')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Map View
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar text-sm font-medium text-gray-500">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 whitespace-nowrap">San José</span>
              <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 whitespace-nowrap hover:bg-gray-100 cursor-pointer">Electronics</span>
              <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 whitespace-nowrap hover:bg-gray-100 cursor-pointer">Home</span>
              <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 whitespace-nowrap hover:bg-gray-100 cursor-pointer">Delivery</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-gray-50/50">
          <AnimatePresence mode="wait">
            {view === 'list' ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {listings.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-0"
              >
                <MapView items={listings} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action for Drivers (MVP feature highlight) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 transform active:scale-95">
          <Truck className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-bold uppercase tracking-wider text-xs">
            Find Express Delivery
          </span>
        </button>
      </div>
    </div>
  );
}

function ListingCard({ item }: { item: any }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {/* Placeholder for real images */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <span className="text-blue-200 font-bold text-4xl">{item.title[0]}</span>
        </div>
        
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold shadow-sm text-blue-600">
          {item.price}
        </div>
        
        {item.type === 'driver' && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
            Certified
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>
        
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>San José, CR</span>
        </div>
        
        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
          <Link href={`/seller/${item.sellerId}`} className="flex items-center gap-2 group/seller">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm group-hover/seller:bg-blue-600 group-hover/seller:text-white transition-all">
              {item.owner[0]}
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover/seller:text-blue-600">{item.owner}</span>
          </Link>
          
          <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg text-orange-600 font-black text-xs">
            <Star className="w-3.5 h-3.5 fill-current" />
            {item.rating}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapView({ items }: { items: any[] }) {
  const center: [number, number] = [9.9281, -84.0907];

  return (
    <div className="h-full w-full">
      {typeof window !== 'undefined' && (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {items.map(item => (
            <Marker key={item.id} position={item.location}>
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-black text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-blue-600 font-black text-lg mb-2">{item.price}</p>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Rating: {item.rating} ⭐</span>
                  </div>
                  <Link 
                    href={`/seller/${item.sellerId}`}
                    className="block w-full bg-black text-white text-[10px] py-2.5 rounded-lg text-center uppercase font-black tracking-widest hover:bg-blue-600 transition-colors mt-2"
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
