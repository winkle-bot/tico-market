'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, Search, User, LogOut } from 'lucide-react';
import { categoryEmojis, categories } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { MODAL_BACKDROP_VARIANTS, SLIDE_IN_VARIANTS } from '@/config/constants';
import type { Category } from '@/types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
  onOpenAuth: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onToggleCategory,
  onOpenAuth,
}: MobileMenuProps) {
  const { user, logout } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...SLIDE_IN_VARIANTS}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl"
          >
            <div className="p-4 border-b flex justify-between items-center">
              <span className="text-xl font-bold text-blue-600">TicoMarket</span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search listings"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="p-4 border-b">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      onToggleCategory(cat as Category);
                      onClose();
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors ${
                      selectedCategories.includes(cat as Category)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {categoryEmojis[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{user.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-gray-700">My Account</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors w-full text-left"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                    <span className="font-bold text-red-600">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
