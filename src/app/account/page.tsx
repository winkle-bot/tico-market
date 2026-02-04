"use client";

import React, { useState, useEffect } from 'react';
import { User, Package, Heart, MessageCircle, Settings, LogOut, Edit2, Trash2, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { categoryEmojis } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountPage() {
  const { user, logout, isLoading: authLoading, toggleFavorite, refreshUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'messages'>('listings');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', description: '' });

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Load listings
      const listingsRes = await fetch('/api/listings');
      const allListings = await listingsRes.json();
      
      // Filter my listings
      const mine = allListings.filter((l: any) => l.sellerId === user.id);
      setMyListings(mine);
      
      // Load user data for favorites
      const userRes = await fetch(`/api/users/${user.id}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        const favoriteIds = userData.favorites || [];
        const favListings = allListings.filter((l: any) => favoriteIds.includes(l.id));
        setFavorites(favListings);
      }
      
      // Load conversations
      const messagesRes = await fetch(`/api/messages?userId=${user.id}`);
      if (messagesRes.ok) {
        const convs = await messagesRes.json();
        setConversations(convs);
      }
    } catch (err) {
      console.error('Error loading account data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (listingId: number) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: user?.id })
      });
      
      if (res.ok) {
        setMyListings(prev => prev.filter(l => l.id !== listingId));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete listing');
      }
    } catch (err) {
      alert('Error deleting listing');
    }
  };

  const handleEdit = (listing: any) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      price: listing.price.replace('₡', ''),
      description: listing.description || ''
    });
  };

  const saveEdit = async () => {
    if (!editingListing) return;
    
    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: user?.id,
          title: editForm.title,
          price: `₡${editForm.price}`,
          description: editForm.description
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setMyListings(prev => prev.map(l => l.id === updated.id ? updated : l));
        setEditingListing(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update listing');
      }
    } catch (err) {
      alert('Error updating listing');
    }
  };

  const removeFavorite = async (listingId: number) => {
    if (!user) return;
    
    // Use the context's toggleFavorite for consistency
    const success = await toggleFavorite(listingId);
    if (success) {
      setFavorites(prev => prev.filter(l => l.id !== listingId));
    }
  };

  // Show loading while auth is hydrating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <div className="space-y-4">
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
                <div className="flex gap-3 pt-4">
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">My Account</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl">
              {user.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900">{user.name}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="ml-auto p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2">
            {[
              { id: 'listings', label: 'My Listings', icon: Package, count: myListings.length },
              { id: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
              { id: 'messages', label: 'Messages', icon: MessageCircle, count: conversations.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 font-bold text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
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
                      <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
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
                      <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
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
                  conversations.map((conv, idx) => (
                    <Link
                      key={idx}
                      href={`/listing/${conv.listingId}`}
                      className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 hover:border-blue-200 transition-colors block"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {conv.listingImage ? (
                          <img src={conv.listingImage} alt={conv.listingTitle} className="w-full h-full object-cover" />
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
                    </Link>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
