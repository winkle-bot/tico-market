'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Key, ShieldCheck } from 'lucide-react';
import { categoryEmojis, categories } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import {
  API_ROUTES,
  DEFAULT_LISTING_COORDS,
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
} from '@/config/constants';
import type { Listing, NewListingForm, Category } from '@/types';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: (listing: Listing) => void;
  onOpenAuth: () => void;
}

const INITIAL_FORM_STATE: NewListingForm = {
  title: '',
  price: '',
  category: 'Electronics',
  description: '',
  image: null,
  pickupOnly: false,
  deliveryAvailable: true,
  pickupLocationIds: [],
};

export function SellModal({
  isOpen,
  onClose,
  onListingCreated,
  onOpenAuth,
}: SellModalProps) {
  const { user } = useAuth();
  const [newItem, setNewItem] = useState<NewListingForm>(INITIAL_FORM_STATE);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    onClose();
    setGeneratedKey(null);
  };

  const handleSubmit = async () => {
    if (!newItem.title.trim() || !newItem.price.trim()) {
      alert('Please fill in title and price');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('price', `₡${newItem.price}`);
    formData.append('category', newItem.category);
    formData.append('sellerId', user?.id || '');
    formData.append('owner', user?.name || 'Guest');
    formData.append('rating', '5.0');
    formData.append('type', 'seller');
    formData.append('lat', String(DEFAULT_LISTING_COORDS.lat));
    formData.append('lng', String(DEFAULT_LISTING_COORDS.lng));
    if (newItem.image) {
      formData.append('image', newItem.image);
    }

    try {
      const res = await fetch(API_ROUTES.LISTINGS, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const created = await res.json();
        onListingCreated(created);
        if (!user) {
          setGeneratedKey(created.privateKey);
        } else {
          alert(`Listing created: ${newItem.title}!`);
          handleClose();
        }
        setNewItem(INITIAL_FORM_STATE);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                List Your Item
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {generatedKey ? (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase mb-2">
                      Item Posted!
                    </h3>
                    <p className="text-gray-500 font-medium">
                      Since you're not logged in, save this private key to edit
                      or delete your post later:
                    </p>
                  </div>
                  <div className="bg-gray-100 p-6 rounded-2xl border-2 border-dashed border-gray-300">
                    <span className="text-3xl font-black text-blue-600 tracking-widest select-all">
                      {generatedKey}
                    </span>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-full bg-black text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm"
                  >
                    Got it, close
                  </button>
                </div>
              ) : (
                <>
                  {!user && (
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3 items-center mb-2">
                      <Key className="w-5 h-5 text-orange-600" />
                      <p className="text-xs font-bold text-orange-800">
                        You are posting as a{' '}
                        <span
                          className="underline cursor-pointer"
                          onClick={() => {
                            handleClose();
                            onOpenAuth();
                          }}
                        >
                          Guest
                        </span>
                        . You'll get a private key to manage this post.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Item Title
                    </label>
                    <input
                      type="text"
                      placeholder="What are you selling?"
                      className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-300 transition-all"
                      value={newItem.title}
                      onChange={(e) =>
                        setNewItem({ ...newItem, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Price (₡)
                      </label>
                      <input
                        type="text"
                        placeholder="15,000"
                        className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 placeholder:text-gray-300 transition-all"
                        value={newItem.price}
                        onChange={(e) =>
                          setNewItem({ ...newItem, price: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Category
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:outline-none font-bold text-gray-900 transition-all appearance-none"
                        value={newItem.category}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            category: e.target.value as Category,
                          })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryEmojis[cat]} {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Item Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 focus:border-blue-500 focus:outline-none font-bold text-gray-400 transition-all cursor-pointer"
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          image: e.target.files?.[0] || null,
                        })
                      }
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />{' '}
                    {isSubmitting ? 'Posting...' : 'Post Listing'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
