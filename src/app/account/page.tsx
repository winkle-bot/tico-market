"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Package, Heart, MessageCircle, LogOut, Edit2, Trash2, Plus, ChevronLeft, ShoppingBag, Truck, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useListings } from '@/context/ListingsContext';
import { categoryEmojis } from '@/lib/data';
import { withCsrfHeaders } from '@/lib/csrf';
import { motion, AnimatePresence } from 'framer-motion';
import ChatModal from '@/components/ChatModal';
import { OrdersTab } from '@/components/account/OrdersTab';
import { NotificationSettings } from '@/components/NotificationSettings';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/context/I18nContext';
import type {
  MarketEvent,
  ListingPickupConfig,
  Listing,
  Order,
  GroupedConversation,
  Review,
  DeliveryRequest,
  DeliveryBid,
} from '@/types';

interface EditFormState {
  title: string;
  priceCents: number;
  description: string;
  leadTime: string;
  deliveryAvailable: boolean;
  marketEvents: MarketEvent[];
}

type AccountTab = 'listings' | 'orders' | 'favorites' | 'messages' | 'deliveries';

const DEFAULT_ACCOUNT_TAB: AccountTab = 'listings';

function parseAccountTab(value: string | null): AccountTab {
  switch (value) {
    case 'orders':
    case 'favorites':
    case 'messages':
    case 'deliveries':
      return value;
    default:
      return DEFAULT_ACCOUNT_TAB;
  }
}

export default function AccountPage() {
  const toast = useToast();
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? 'es-CR' : 'en-US';
  const { user, logout, isLoading: authLoading, toggleFavorite } = useAuth();
  const { listings, updateListing, deleteListing } = useListings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTab>(DEFAULT_ACCOUNT_TAB);
  const [deliverySection, setDeliverySection] = useState<'requests' | 'bids' | 'tasks'>('requests');
  
  // Derived state from context
  const myListings = useMemo(
    () => listings.filter((l) => l.sellerId === user?.id),
    [listings, user?.id]
  );
  const favorites = useMemo(
    () => listings.filter((l) => user?.favorites?.includes(l.id)),
    [listings, user?.favorites]
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewsByOrder, setReviewsByOrder] = useState<Record<string, Review>>({});
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [deliveryBids, setDeliveryBids] = useState<DeliveryBid[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryRequest[]>([]);
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
    priceCents: 0,
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
  const refreshLockRef = useRef<Partial<Record<'messages' | 'orders', number>>>({});

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    const messagesRes = await fetch(`/api/messages?userId=${user.id}`);
    if (!messagesRes.ok) return;
    const convs = await messagesRes.json();
    setConversations(convs);
  }, [user]);

  const refreshOrdersAndReviews = useCallback(async () => {
    if (!user) return;
    const [ordersRes, reviewsRes] = await Promise.all([
      fetch(`/api/orders?userId=${user.id}`),
      fetch(`/api/reviews?buyerId=${user.id}`),
    ]);

    if (ordersRes.ok) {
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
    }

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
  }, [user]);

  const refreshDeliveries = useCallback(async () => {
    if (!user) return;

    const [requestsRes, bidsRes, tasksRes] = await Promise.all([
      fetch(`/api/delivery-requests?requesterId=${user.id}&limit=60`),
      fetch(`/api/delivery-bids?driverId=${user.id}&limit=60`),
      fetch(`/api/delivery-requests?assignedDriverId=${user.id}&limit=60`),
    ]);

    if (requestsRes.ok) {
      const payload = await requestsRes.json();
      setDeliveryRequests(payload.data || []);
    } else {
      setDeliveryRequests([]);
    }

    if (bidsRes.ok) {
      const payload = await bidsRes.json();
      setDeliveryBids(payload.data || []);
    } else {
      setDeliveryBids([]);
    }

    if (tasksRes.ok) {
      const payload = await tasksRes.json();
      setDeliveryTasks(payload.data || []);
    } else {
      setDeliveryTasks([]);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      await Promise.all([refreshConversations(), refreshOrdersAndReviews(), refreshDeliveries()]);
    } catch (err) {
      console.error('Error loading account data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshConversations, refreshDeliveries, refreshOrdersAndReviews, user]);

  const refreshByTable = useCallback((table: 'messages' | 'orders') => {
    const lockUntil = refreshLockRef.current[table] || 0;
    if (Date.now() < lockUntil) {
      return;
    }
    refreshLockRef.current[table] = Date.now() + 1500;

    if (table === 'messages') {
      void refreshConversations();
      return;
    }
    void refreshOrdersAndReviews();
  }, [refreshConversations, refreshOrdersAndReviews]);

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
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace('#', '') || null;
      setActiveTab(parseAccountTab(hash));
    };

    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);

    return () => {
      window.removeEventListener('hashchange', syncTabFromHash);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const source = new EventSource(`/api/events?userId=${user.id}`);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; table?: string };
        if (payload.type === 'update' && (payload.table === 'orders' || payload.table === 'messages')) {
          refreshByTable(payload.table);
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
  }, [refreshByTable, user]);

  const handleDelete = async (listingId: number) => {
    const now = Date.now();
    const lastAttempt = pendingDeleteRef.current[listingId] || 0;
    if (now - lastAttempt > 5000) {
      pendingDeleteRef.current[listingId] = now;
      toast.info(t('account.deleteConfirm', 'Tap delete again to confirm'), {
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
      priceCents: listing.priceCents,
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
          priceCents: editForm.priceCents,
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

  const handleTabChange = (nextTab: AccountTab) => {
    setActiveTab(nextTab);
    const nextHash = nextTab === DEFAULT_ACCOUNT_TAB ? '' : `#${nextTab}`;
    window.history.replaceState(null, '', `/account${nextHash}`);
  };


  // Show loading while auth is hydrating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center">
        <div className="animate-pulse text-gray-400 font-medium">{t('common.loading', 'Loading...')}</div>
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
              <h2 className="text-2xl font-black text-gray-900 uppercase mb-6">{t('account.editListing', 'Edit Listing')}</h2>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('account.title', 'Title')}</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('account.price', 'Price')} (₡)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.priceCents}
                    onChange={e => setEditForm({ ...editForm, priceCents: Number.parseInt(e.target.value, 10) || 0 })}
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
                    <h3 className="text-sm font-black text-gray-900 uppercase">{t('account.availabilityLogistics', 'Availability & Logistics')}</h3>
                    
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
                              <button onClick={handleAddEvent} className="flex-1 bg-black text-white text-xs font-bold py-2 rounded-lg">{t('sell.addEvent', 'Add Event')}</button>
                              <button onClick={() => setShowEventForm(false)} className="px-3 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowEventForm(true)}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-3 h-3" /> {t('sell.addEvent', 'Add Market/Event')}
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
            <h1 className="text-2xl font-black text-[#18284a] uppercase tracking-tight">{t('account.myAccount', 'My Account')}</h1>
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

      {/* Notification Settings */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <NotificationSettings />
      </div>

      {/* Tabs */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-[#dce5f7] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { id: 'listings', label: t('account.myListings', 'Listings'), icon: Package, count: myListings.length },
              { id: 'orders', label: t('account.orders', 'Orders'), icon: ShoppingBag, count: orders.length },
              { id: 'favorites', label: t('account.favorites', 'Saved'), icon: Heart, count: favorites.length },
              { id: 'messages', label: t('account.messages', 'Chats'), icon: MessageCircle, count: conversations.length },
              { id: 'deliveries', label: t('account.deliveries', 'Deliveries'), icon: Truck, count: deliveryRequests.length + deliveryTasks.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as AccountTab)}
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
            <div className="animate-pulse text-gray-400 font-medium">{t('common.loading', 'Loading...')}</div>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('account.noListings', 'No listings yet')}</h3>
                    <p className="text-gray-500 mb-6">{t('account.startSelling', 'Start selling by creating your first listing')}</p>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('account.noFavorites', 'No favorites yet')}</h3>
                    <p className="text-gray-500">{t('account.saveFavorites', 'Save listings you like to find them later')}</p>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('account.noMessages', 'No messages yet')}</h3>
                    <p className="text-gray-500">{t('account.startConversation', 'Start a conversation by messaging a seller')}</p>
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
                              {new Date(conv.lastMessageAt).toLocaleDateString(dateLocale)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">with {conv.otherPartyName}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.messages[conv.messages.length - 1]?.text ||
                              (conv.messages[conv.messages.length - 1]?.attachments?.some((attachment) => attachment.type === 'image')
                                ? 'Image attachment'
                                : conv.messages[conv.messages.length - 1]?.attachments?.some((attachment) => attachment.type === 'location')
                                  ? 'Location pin'
                                  : '')}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'deliveries' && (
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl border border-[#dce5f7] bg-white p-1">
                  <button
                    onClick={() => setDeliverySection('requests')}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold ${deliverySection === 'requests' ? 'bg-blue-600 text-white' : 'text-[#4f6899]'}`}
                  >
                    My Requests
                  </button>
                  <button
                    onClick={() => setDeliverySection('bids')}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold ${deliverySection === 'bids' ? 'bg-blue-600 text-white' : 'text-[#4f6899]'}`}
                  >
                    My Bids
                  </button>
                  <button
                    onClick={() => setDeliverySection('tasks')}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold ${deliverySection === 'tasks' ? 'bg-blue-600 text-white' : 'text-[#4f6899]'}`}
                  >
                    My Tasks
                  </button>
                </div>

                {deliverySection === 'requests' && (
                  <div className="space-y-3">
                    {deliveryRequests.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                        No delivery requests yet.
                      </div>
                    ) : (
                      deliveryRequests.map((request) => (
                        <div key={request.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-400 font-black">Request #{request.id.slice(0, 8)}</p>
                          <p className="font-bold text-gray-900 mt-1 line-clamp-2">{request.itemDescription}</p>
                          <p className="text-sm text-gray-600 mt-1">Pickup: {request.pickupAddress}</p>
                          <p className="text-sm text-gray-600">Dropoff: {request.dropoffAddress}</p>
                          <p className="text-xs font-semibold text-blue-600 mt-2">Status: {request.status}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {deliverySection === 'bids' && (
                  <div className="space-y-3">
                    {deliveryBids.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                        No delivery bids yet.
                      </div>
                    ) : (
                      deliveryBids.map((bid) => (
                        <div key={bid.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-400 font-black">Bid #{bid.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-700 mt-1">Task: {bid.deliveryRequestId.slice(0, 8)}</p>
                          <p className="text-sm font-bold text-gray-900">Amount: ₡{bid.amount.toLocaleString('es-CR')}</p>
                          <p className="text-xs font-semibold text-blue-600 mt-1">Status: {bid.status}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {deliverySection === 'tasks' && (
                  <div className="space-y-3">
                    {deliveryTasks.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                        No assigned delivery tasks.
                      </div>
                    ) : (
                      deliveryTasks.map((task) => (
                        <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-400 font-black">Task #{task.id.slice(0, 8)}</p>
                          <p className="font-bold text-gray-900 mt-1 line-clamp-2">{task.itemDescription}</p>
                          <p className="text-sm text-gray-600 mt-1">Pickup: {task.pickupAddress}</p>
                          <p className="text-sm text-gray-600">Dropoff: {task.dropoffAddress}</p>
                          <p className="text-xs font-semibold text-blue-600 mt-2">Status: {task.status}</p>
                        </div>
                      ))
                    )}
                  </div>
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
