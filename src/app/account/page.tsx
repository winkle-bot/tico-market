"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Heart, MessageCircle, LogOut, Edit2, Trash2, Plus, ChevronLeft, ShoppingBag, Clock, CheckCircle, XCircle, Truck, MapPin, PlusCircle, Route, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useListings } from '@/context/ListingsContext';
import { categoryEmojis } from '@/lib/data';
import { withCsrfHeaders } from '@/lib/csrf';
import { motion, AnimatePresence } from 'framer-motion';
import ChatModal from '@/components/ChatModal';
import { useToast } from '@/context/ToastContext';
import type { DeliveryMeta, MarketEvent, ListingPickupConfig, Listing, Order, GroupedConversation, Review } from '@/types';

interface EditFormState {
  title: string;
  price: string;
  description: string;
  leadTime: string;
  deliveryAvailable: boolean;
  marketEvents: MarketEvent[];
}

export default function AccountPage() {
  const toast = useToast();
  const { user, logout, isLoading: authLoading, toggleFavorite } = useAuth();
  const { listings, updateListing, deleteListing } = useListings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listings' | 'orders' | 'favorites' | 'messages'>('listings');
  
  // Derived state from context
  const myListings = listings.filter((l) => l.sellerId === user?.id);
  const favorites = listings.filter((l) => user?.favorites?.includes(l.id));

  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewsByOrder, setReviewsByOrder] = useState<Record<string, Review>>({});
  const [conversations, setConversations] = useState<GroupedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [activeChat, setActiveChat] = useState<{
    listing: { id: number; title: string; sellerId: string; owner: string; imageUrl?: string };
    chatWithName: string;
    chatWithId: string;
  } | null>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState<EditFormState>({ 
    title: '', 
    price: '', 
    description: '',
    leadTime: '',
    deliveryAvailable: true,
    marketEvents: []
  });
  
  // New Event Form State (inside Edit Modal)
  const [newEvent, setNewEvent] = useState<Partial<MarketEvent>>({
    name: '',
    date: '',
    timeWindow: '',
    wazeLink: ''
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const pendingDeleteRef = useRef<Record<number, number>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Load conversations
      const messagesRes = await fetch(`/api/messages?userId=${user.id}`);
      if (messagesRes.ok) {
        const convs = await messagesRes.json();
        setConversations(convs);
      }
      
      // Load orders
      const ordersRes = await fetch(`/api/orders?userId=${user.id}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      const reviewsRes = await fetch(`/api/reviews?buyerId=${user.id}`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        const map = (reviewsData as Review[]).reduce<Record<string, Review>>((acc, review) => {
          acc[review.orderId] = review;
          return acc;
        }, {});
        setReviewsByOrder(map);
      } else {
        setReviewsByOrder({});
      }
    } catch (err) {
      console.error('Error loading account data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  useEffect(() => {
    if (!user) return;

    const source = new EventSource(`/api/events?userId=${user.id}`);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; table?: string };
        if (payload.type === 'update' && (payload.table === 'orders' || payload.table === 'messages')) {
          void loadData();
        }
      } catch {
        // Ignore malformed heartbeat payloads.
      }
    };
    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [loadData, user]);

  const handleDelete = async (listingId: number) => {
    const now = Date.now();
    const lastAttempt = pendingDeleteRef.current[listingId] || 0;
    if (now - lastAttempt > 5000) {
      pendingDeleteRef.current[listingId] = now;
      toast.info('Tap delete again to confirm.', {
        description: 'This confirmation expires in 5 seconds.',
      });
      return;
    }
    
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sellerId: user?.id })
      });
      
      if (res.ok) {
        deleteListing(listingId);
        delete pendingDeleteRef.current[listingId];
        toast.success('Listing deleted.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete listing');
      }
    } catch {
      toast.error('Error deleting listing');
    }
  };

  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    const config = listing.pickupConfig || {};
    setEditForm({
      title: listing.title,
      price: listing.price.replace('₡', ''),
      description: listing.description || '',
      leadTime: config.leadTime || '',
      deliveryAvailable: config.deliveryAvailable !== false, // default true
      marketEvents: config.marketEvents || []
    });
  };

  const handleAddEvent = () => {
    if (newEvent.name && newEvent.date) {
      setEditForm({
        ...editForm,
        marketEvents: [
          ...editForm.marketEvents,
          {
            id: Date.now().toString(),
            name: newEvent.name!,
            date: newEvent.date!,
            timeWindow: newEvent.timeWindow || '',
            locationName: newEvent.name!,
            wazeLink: newEvent.wazeLink
          } as MarketEvent
        ]
      });
      setNewEvent({ name: '', date: '', timeWindow: '', wazeLink: '' });
      setShowEventForm(false);
    }
  };

  const removeEvent = (id: string) => {
    setEditForm({
      ...editForm,
      marketEvents: editForm.marketEvents.filter(e => e.id !== id)
    });
  };

  const saveEdit = async () => {
    if (!editingListing) return;
    
    // Construct pickup config
    const pickupConfig: ListingPickupConfig = {
        deliveryAvailable: editForm.deliveryAvailable,
        pickupOnly: !editForm.deliveryAvailable, // simplified logic
        leadTime: editForm.leadTime,
        marketEvents: editForm.marketEvents,
        // preserve existing if needed, but for now overwrite
    };

    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sellerId: user?.id,
          title: editForm.title,
          price: `₡${editForm.price}`,
          description: editForm.description,
          pickupConfig
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        updateListing(updated);
        setEditingListing(null);
        toast.success('Listing updated.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update listing');
      }
    } catch {
      toast.error('Error updating listing');
    }
  };

  const removeFavorite = async (listingId: number) => {
    if (!user) return;
    toggleFavorite(listingId);
  };


  // Show loading while auth is hydrating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center">
        <div className="animate-pulse text-gray-400 font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      {/* Chat Modal */}
      <ChatModal
        isOpen={!!activeChat}
        onClose={() => setActiveChat(null)}
        listing={activeChat?.listing || { id: 0, title: '', sellerId: '', owner: '' }}
        currentUser={user}
        onAuthRequired={() => {}}
        chatWithName={activeChat?.chatWithName}
        chatWithId={activeChat?.chatWithId}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {editingListing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingListing(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-black text-gray-900 uppercase mb-6">Edit Listing</h2>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price (₡)</label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold resize-none"
                  />
                </div>

                {/* Logistics Section */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase">Availability & Logistics</h3>
                    
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editForm.deliveryAvailable}
                        onChange={(e) => setEditForm({...editForm, deliveryAvailable: e.target.checked})}
                      />
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          Express Delivery Available
                        </div>
                      </div>
                    </label>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Lead Time
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ready in 2 days"
                          className="w-full p-3 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-blue-500 text-sm font-bold"
                          value={editForm.leadTime}
                          onChange={(e) => setEditForm({...editForm, leadTime: e.target.value})}
                        />
                    </div>

                    {/* Market Events */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Market Days / Events
                        </label>
                        
                        <div className="space-y-2 mb-3">
                          {editForm.marketEvents.map(event => (
                            <div key={event.id} className="bg-blue-50 p-3 rounded-xl flex justify-between items-center group">
                              <div>
                                <div className="font-bold text-sm text-blue-900">{event.name}</div>
                                <div className="text-xs text-blue-600">{event.date} • {event.timeWindow}</div>
                              </div>
                              <button onClick={() => removeEvent(event.id)} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {showEventForm ? (
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
                            <input 
                              placeholder="Event Name"
                              className="w-full p-2 rounded-lg border border-gray-200 text-sm font-semibold"
                              value={newEvent.name}
                              onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-2">
                               <input 
                                placeholder="When? (e.g. Sat 7-12)"
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-semibold"
                                value={newEvent.date}
                                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                              />
                               <input 
                                placeholder="Waze Link (Optional)"
                                className="w-full p-2 rounded-lg border border-gray-200 text-sm font-semibold"
                                value={newEvent.wazeLink}
                                onChange={e => setNewEvent({...newEvent, wazeLink: e.target.value})}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleAddEvent} className="flex-1 bg-black text-white text-xs font-bold py-2 rounded-lg">Add Event</button>
                              <button onClick={() => setShowEventForm(false)} className="px-3 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowEventForm(true)}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-3 h-3" /> Add Market/Event
                          </button>
                        )}
                      </div>
                </div>

              </div>
              <div className="flex gap-3 pt-4 border-t mt-4">
                  <button
                    onClick={() => setEditingListing(null)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/" className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">My Account</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl">
              {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900">{user.name || 'User'}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <Link
                href="/admin"
                className="ml-auto px-4 py-2 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors min-h-12"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { id: 'listings', label: 'Listings', icon: Package, count: myListings.length },
              { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
              { id: 'favorites', label: 'Saved', icon: Heart, count: favorites.length },
              { id: 'messages', label: 'Chats', icon: MessageCircle, count: conversations.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                className={`flex items-center justify-center gap-1.5 min-w-0 flex-1 px-2 sm:px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap min-h-12 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-gray-400 font-medium">Loading...</div>
          </div>
        ) : (
          <>
            {/* My Listings Tab */}
            {activeTab === 'listings' && (
              <div className="space-y-4">
                {myListings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-500 mb-6">Start selling by creating your first listing</p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" /> Create Listing
                    </Link>
                  </div>
                ) : (
                  myListings.map(listing => (
                    <div key={listing.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4">
                      <div className="relative w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {listing.imageUrl ? (
                          <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            {categoryEmojis[listing.category] || '✨'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${listing.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                          {listing.title}
                        </Link>
                        <p className="text-blue-600 font-bold text-lg">{listing.price}</p>
                        <p className="text-sm text-gray-500">{listing.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(listing)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                userId={user.id}
                reviewsByOrder={reviewsByOrder}
                onStatusChange={loadData}
              />
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="space-y-4">
                {favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h3>
                    <p className="text-gray-500">Save listings you like by tapping the heart icon</p>
                  </div>
                ) : (
                  favorites.map(listing => (
                    <div key={listing.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4">
                      <div className="relative w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {listing.imageUrl ? (
                          <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            {categoryEmojis[listing.category] || '✨'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${listing.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                          {listing.title}
                        </Link>
                        <p className="text-blue-600 font-bold text-lg">{listing.price}</p>
                        <p className="text-sm text-gray-500">{listing.owner}</p>
                      </div>
                      <button
                        onClick={() => removeFavorite(listing.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors self-center"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-gray-500">Start a conversation by messaging a seller</p>
                  </div>
                ) : (
                  conversations.map((conv, idx) => {
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveChat({
                          listing: {
                            id: conv.listingId,
                            title: conv.listingTitle,
                            sellerId: conv.messages[0]?.sellerId || '',
                            owner: conv.messages[0]?.sellerName || '',
                            imageUrl: conv.listingImage
                          },
                          chatWithName: conv.otherPartyName,
                          chatWithId: conv.otherPartyId
                        })}
                        className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 hover:border-blue-200 transition-colors text-left"
                      >
                        <div className="relative w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {conv.listingImage ? (
                            <Image src={conv.listingImage} alt={conv.listingTitle} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-100">
                              <MessageCircle className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900 truncate">{conv.listingTitle}</h3>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {new Date(conv.lastMessageAt).toLocaleDateString('es-CR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">with {conv.otherPartyName}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.messages[conv.messages.length - 1]?.text}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Orders Tab Component
function OrdersTab({ 
  orders, 
  userId, 
  reviewsByOrder,
  onStatusChange 
}: { 
  orders: Order[]; 
  userId: string;
  reviewsByOrder: Record<string, Review>;
  onStatusChange: () => void;
}) {
  const toast = useToast();
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deliveryNoteByOrder, setDeliveryNoteByOrder] = useState<Record<string, string>>({});

  const updateOrder = async (
    orderId: string,
    payload: Record<string, unknown>,
    successMessage = 'Order status updated.'
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onStatusChange();
        toast.success(successMessage);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update order');
      }
    } catch {
      toast.error('Error updating order');
    }
  };

  const getDeliveryMeta = (order: Order): DeliveryMeta | null => {
    const raw = order.listingSnapshot?.deliveryMeta;
    if (!raw || typeof raw !== 'object') return null;
    return raw as DeliveryMeta;
  };

  const submitReview = async () => {
    if (!reviewingOrderId || isSubmittingReview) return;

    setReviewError(null);
    setIsSubmittingReview(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          orderId: reviewingOrderId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      setReviewingOrderId(null);
      setReviewComment('');
      setReviewRating(5);
      onStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit review';
      setReviewError(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      in_transit: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      confirmed: <CheckCircle className="w-3 h-3" />,
      in_transit: <Truck className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
    };
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_transit: 'In Transit',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.pending}`}>
        {icons[status]}
        {labels[status] || status}
      </span>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500">Your purchases and sales will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => {
        const isSeller = order.sellerId === userId;
        const isBuyer = order.buyerId === userId;
        const isDriver = order.driverId === userId;
        const hasReview = Boolean(reviewsByOrder[order.id]);
        const deliveryMeta = getDeliveryMeta(order);
        const updates = deliveryMeta?.updates || [];
        const recentUpdates = updates.slice(-3).reverse();
        const driverEta = deliveryMeta?.estimatedEtaMinutes;
        const phase = deliveryMeta?.phase || (order.status === 'in_transit' ? 'picked_up' : 'awaiting_confirmation');
        const phaseIndex = (() => {
          const map: Record<string, number> = {
            awaiting_confirmation: 0,
            awaiting_pickup: 1,
            picked_up: 2,
            near_buyer: 3,
            delivered: 4,
          };
          return map[phase] ?? 0;
        })();
        
        return (
          <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            {/* Order header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('es-CR')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isSeller ? `Buyer: ${order.buyerName}` : `Seller: ${order.sellerName}`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                {order.type === 'pickup' ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pickup
                  </span>
                ) : (
                  <span className="text-blue-600 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Delivery
                  </span>
                )}
              </div>
            </div>

            {/* Order content */}
            <div className="flex gap-4 mb-4">
              <div className="relative w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {order.listingSnapshot?.imageUrl ? (
                  <Image src={order.listingSnapshot.imageUrl} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/listing/${order.listingId}`}
                  className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {order.listingSnapshot?.title || 'Unknown Item'}
                </Link>
                <p className="text-blue-600 font-bold text-lg">{order.listingSnapshot?.price}</p>
                {order.type === 'delivery' && order.deliveryFee && (
                  <p className="text-xs text-gray-500">+ ₡{order.deliveryFee.toLocaleString()} delivery</p>
                )}
              </div>
            </div>

            {/* Location/Address info */}
            {order.type === 'pickup' && order.pickupLocation && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p className="font-bold text-gray-900">{order.pickupLocation.name}</p>
                <p className="text-gray-600">{order.pickupLocation.address}</p>
                {order.scheduledWindow && (
                  <p className="text-blue-600 mt-1">Preferred: {order.scheduledWindow}</p>
                )}
              </div>
            )}
            {order.type === 'delivery' && order.deliveryAddress && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p className="font-bold text-gray-900">Deliver to:</p>
                <p className="text-gray-600">{order.deliveryAddress}</p>
              </div>
            )}

            {order.type === 'delivery' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Express Tracking
                  </p>
                  <p className="text-xs text-blue-700 font-bold">
                    {driverEta ? `ETA ~${driverEta} min` : 'Updating ETA'}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {['Seller', 'Pickup', 'En ruta', 'Cerca', 'Entregado'].map((label, idx) => (
                    <div key={label} className="text-center">
                      <div className={`w-6 h-6 rounded-full mx-auto mb-1 border ${idx <= phaseIndex ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}`} />
                      <p className="text-[10px] text-blue-700 font-semibold">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Driver: {order.driverName || 'Unassigned'}</p>
                  {deliveryMeta?.driverLocationLabel && <p>Location: {deliveryMeta.driverLocationLabel}</p>}
                </div>
              </div>
            )}

            {order.type === 'delivery' && recentUpdates.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <Route className="w-3.5 h-3.5" /> Live Order Room
                </p>
                {recentUpdates.map((update) => (
                  <div key={update.id} className="text-xs text-slate-700">
                    <span className="font-bold capitalize">{update.byRole}</span>
                    <span className="mx-1 text-slate-400">•</span>
                    <span>{update.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-yellow-50 rounded-xl p-3 mb-4 text-sm border border-yellow-100">
                <p className="text-yellow-800">📝 {order.notes}</p>
              </div>
            )}

            {/* Actions */}
            {order.status === 'pending' && isSeller && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        status: 'confirmed',
                        trackingEvent: {
                          phase: 'awaiting_pickup',
                          message: 'Seller confirmed. Preparing handoff to driver.',
                        },
                      },
                      'Order confirmed.'
                    )
                  }
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Confirm Order
                </button>
                <button
                  onClick={() => updateOrder(order.id, { status: 'cancelled' }, 'Order cancelled.')}
                  className="px-4 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Decline
                </button>
              </div>
            )}
            {order.status === 'confirmed' && isSeller && (
              <div className="flex gap-2">
                {order.type === 'delivery' && (
                  <button
                    onClick={() =>
                      updateOrder(
                        order.id,
                        {
                          status: 'in_transit',
                          trackingEvent: {
                            phase: 'picked_up',
                            message: 'Package handed to driver.',
                          },
                        },
                        'Driver handoff recorded.'
                      )
                    }
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
                  >
                    Hand to Driver
                  </button>
                )}
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      { status: 'completed', trackingEvent: { phase: 'delivered', message: 'Seller marked order completed.' } },
                      'Order completed.'
                    )
                  }
                  className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Mark Completed
                </button>
              </div>
            )}
            {order.status === 'confirmed' && isDriver && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    {
                      status: 'in_transit',
                      trackingEvent: {
                        phase: 'picked_up',
                        message: 'Driver picked up package from seller.',
                      },
                    },
                    'Pickup confirmed.'
                  )
                }
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
              >
                I Picked It Up
              </button>
            )}
            {order.status === 'in_transit' && isSeller && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    { status: 'completed', trackingEvent: { phase: 'delivered', message: 'Seller marked as delivered.' } },
                    'Order completed.'
                  )
                }
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                Mark Completed
              </button>
            )}
            {order.status === 'in_transit' && isDriver && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        trackingEvent: {
                          phase: 'near_buyer',
                          message: 'Driver is near the delivery point.',
                          etaMinutes: 8,
                        },
                      },
                      'Buyer notified.'
                    )
                  }
                  className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Near Buyer
                </button>
                <button
                  onClick={() =>
                    updateOrder(
                      order.id,
                      {
                        status: 'completed',
                        trackingEvent: {
                          phase: 'delivered',
                          message: 'Driver delivered the order.',
                          etaMinutes: 0,
                        },
                      },
                      'Delivery completed.'
                    )
                  }
                  className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Delivered
                </button>
              </div>
            )}
            {order.status === 'pending' && isBuyer && (
              <button
                onClick={() => updateOrder(order.id, { status: 'cancelled' }, 'Order cancelled.')}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel Order
              </button>
            )}
            {order.status === 'in_transit' && isBuyer && (
              <button
                onClick={() =>
                  updateOrder(
                    order.id,
                    {
                      status: 'completed',
                      trackingEvent: { phase: 'delivered', message: 'Buyer confirmed delivery received.' },
                    },
                    'Thanks. Delivery confirmed.'
                  )
                }
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                I Received It
              </button>
            )}
            {order.type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled' && (isBuyer || isSeller || isDriver) && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={deliveryNoteByOrder[order.id] || ''}
                  onChange={(e) =>
                    setDeliveryNoteByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                  }
                  placeholder="Post a quick update"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    const note = (deliveryNoteByOrder[order.id] || '').trim();
                    if (!note) return;
                    void updateOrder(
                      order.id,
                      {
                        trackingEvent: {
                          message: note,
                        },
                      },
                      'Update posted.'
                    );
                    setDeliveryNoteByOrder((prev) => ({ ...prev, [order.id]: '' }));
                  }}
                  className="px-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
                >
                  Post
                </button>
              </div>
            )}
            {order.status === 'completed' && isBuyer && !hasReview && (
              <button
                onClick={() => {
                  setReviewingOrderId(order.id);
                  setReviewRating(5);
                  setReviewComment('');
                  setReviewError(null);
                }}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
              >
                Leave Review
              </button>
            )}
            {order.status === 'completed' && hasReview && (
              <div className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl text-sm text-center">
                Reviewed: {reviewsByOrder[order.id].rating}/5
              </div>
            )}
          </div>
        );
      })}

      <AnimatePresence>
        {reviewingOrderId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-black text-gray-900 mb-2 uppercase">Leave a Review</h3>
              <p className="text-sm text-gray-500 mb-4">Rate your order experience.</p>

              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setReviewRating(value)}
                    className={`w-10 h-10 rounded-full border font-black ${
                      reviewRating >= value
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional comment"
                rows={4}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
              />

              {reviewError && (
                <p className="text-sm text-red-600 mt-3">{reviewError}</p>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setReviewingOrderId(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={isSubmittingReview}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
