"use client";

import React, { useState, useEffect } from 'react';
import { User, Package, Heart, MessageCircle, Settings, LogOut, Edit2, Trash2, Plus, ChevronLeft, ShoppingBag, Clock, CheckCircle, XCircle, Truck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { categoryEmojis } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountPage() {
  const { user, logout, isLoading: authLoading, toggleFavorite, refreshUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listings' | 'orders' | 'favorites' | 'messages'>('listings');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
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
      
      // Load orders
      const ordersRes = await fetch(`/api/orders?userId=${user.id}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
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
              { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
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

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <OrdersTab orders={orders} userId={user.id} onStatusChange={loadData} />
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

// Orders Tab Component
function OrdersTab({ 
  orders, 
  userId, 
  onStatusChange 
}: { 
  orders: any[]; 
  userId: string;
  onStatusChange: () => void;
}) {
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId })
      });
      
      if (res.ok) {
        onStatusChange();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update order');
      }
    } catch (err) {
      alert('Error updating order');
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
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {order.listingSnapshot?.imageUrl ? (
                  <img src={order.listingSnapshot.imageUrl} alt="" className="w-full h-full object-cover" />
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
                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Confirm Order
                </button>
                <button
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
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
                    onClick={() => updateOrderStatus(order.id, 'in_transit')}
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
                  >
                    Mark In Transit
                  </button>
                )}
                <button
                  onClick={() => updateOrderStatus(order.id, 'completed')}
                  className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  Mark Completed
                </button>
              </div>
            )}
            {order.status === 'in_transit' && isSeller && (
              <button
                onClick={() => updateOrderStatus(order.id, 'completed')}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
              >
                Mark Completed
              </button>
            )}
            {order.status === 'pending' && isBuyer && (
              <button
                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel Order
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
