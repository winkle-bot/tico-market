"use client";

import React, { useState } from 'react';
import { Search, MapPin, Star, Truck, Menu, X, PlusCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { listings, categoryEmojis } from '@/lib/data';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function Home() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', price: '', category: 'Electronics' });
  const [localListings, setLocalListings] = useState(listings);

  const drivers = localListings.filter(l => l.type === 'driver');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  {bookingStep === 1 ? 'Choose Your Driver' : 'Confirm Delivery'}
                </h2>
                <button 
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                {bookingStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 font-medium">Available drivers near your area in San José:</p>
                    {drivers.map(driver => (
                      <div 
                        key={driver.id}
                        onClick={() => {
                          setSelectedDriver(driver);
                          setBookingStep(2);
                        }}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-500 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                            {driver.owner[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{driver.owner}</h3>
                            <div className="flex items-center gap-1 text-orange-500 text-xs font-black">
                              <Star className="w-3 h-3 fill-current" /> {driver.rating}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Fee</span>
                          <span className="text-blue-600 font-black">₡2,500</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Truck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-black text-blue-900 uppercase text-xs tracking-widest mb-1">Delivery Summary</h4>
                        <p className="text-blue-800 text-sm font-medium">Express delivery with **{selectedDriver?.owner}**</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pick-up Location</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">Central Market, San José</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Drop-off Location</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <input 
                            type="text" 
                            placeholder="Enter your address..." 
                            className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-900 w-full placeholder:text-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        alert("Booking requested! Luis is on his way.");
                        setIsBookingModalOpen(false);
                        setBookingStep(1);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-sm"
                    >
                      Book Now • ₡2,500
                    </button>
                    <button 
                      onClick={() => setBookingStep(1)}
                      className="w-full text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Change Driver
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sell Modal */}
      <AnimatePresence>
        {isSellModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSellModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  List Your Item
                </h2>
                <button 
                  onClick={() => setIsSellModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Item Title</label>
                  <input 
                    type="text" 
                    placeholder="What are you selling?" 
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-300 transition-all"
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price (₡)</label>
                    <input 
                      type="text" 
                      placeholder="15,000" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-300 transition-all"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 transition-all appearance-none"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    >
                      <option>Electronics</option>
                      <option>Home</option>
                      <option>Vehicles</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4 items-start">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-tight">Location Tagged</p>
                    <p className="text-sm font-medium text-blue-700">San José, Costa Rica</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const listing = {
                      id: localListings.length + 1,
                      sellerId: "c0dii-user",
                      title: newItem.title,
                      price: `₡${newItem.price}`,
                      category: newItem.category,
                      location: [9.9281, -84.0907],
                      rating: 5.0,
                      type: 'seller',
                      owner: "Codi"
                    };
                    setLocalListings([listing, ...localListings]);
                    alert(`Listing created: ${newItem.title}!`);
                    setIsSellModalOpen(false);
                    setNewItem({ title: '', price: '', category: 'Electronics' });
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" /> Post Listing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setIsSellModalOpen(true)}
                className="flex items-center gap-1 bg-blue-600 sm:bg-transparent text-white sm:text-gray-600 hover:text-blue-600 font-bold px-3 py-1.5 sm:px-0 sm:py-0 rounded-full transition-all text-xs sm:text-base active:scale-95"
              >
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Sell
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
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
                    {localListings.map((item) => (
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
                    <MapView items={localListings} />
                  </motion.div>
                )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action for Drivers (MVP feature highlight) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsBookingModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 transform active:scale-95"
        >
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
          <span className="text-6xl filter drop-shadow-sm transition-transform duration-500 group-hover:scale-125">
            {categoryEmojis[item.category] || '✨'}
          </span>
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
