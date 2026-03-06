'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, Search, User, LogOut } from 'lucide-react';
import { categoryEmojis, categories } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { MODAL_BACKDROP_VARIANTS, SLIDE_IN_VARIANTS } from '@/config/constants';
import { useOverlayDialog } from '@/lib/use-overlay-dialog';
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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useOverlayDialog<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef: searchInputRef,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...SLIDE_IN_VARIANTS}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            ref={dialogRef}
            tabIndex={-1}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[88vw] bg-white shadow-2xl border-l border-[#dce5f7]"
          >
            <div className="p-4 border-b border-[#dce5f7] flex justify-between items-center">
              <span className="text-xl font-black text-blue-700">TicoMarket</span>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Search */}
            <div className="p-4 border-b border-[#dce5f7]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f83ad] w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="tm-input pl-10"
                  aria-label="Search listings"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-[#dce5f7]">
              <h3 className="text-xs font-black text-[#6f83ad] uppercase tracking-widest mb-3">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onToggleCategory(cat as Category)}
                    className={`tm-chip ${
                      selectedCategories.includes(cat as Category)
                        ? 'tm-chip-active'
                        : ''
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
                  <div className="flex items-center gap-3 p-3 bg-[#f5f8ff] rounded-2xl mb-4 border border-[#dce5f7]">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-[#18284a]">{user.name || 'User'}</p>
                      <p className="text-sm text-[#6f83ad]">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 hover:bg-[#f5f8ff] rounded-xl transition-colors min-h-12"
                  >
                    <User className="w-5 h-5 text-[#6f83ad]" />
                    <span className="font-bold text-[#334d80]">My Account</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors w-full text-left min-h-12"
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
                  className="w-full tm-btn tm-btn-primary"
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
