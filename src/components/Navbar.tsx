'use client';

import Link from 'next/link';
import { Search, PlusCircle, User, LogOut, Menu, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSellModal: () => void;
  onOpenAuthModal: () => void;
  onOpenMobileMenu: () => void;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  onOpenSellModal,
  onOpenAuthModal,
  onOpenMobileMenu,
}: NavbarProps) {
  const { user, logout, unreadCount } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#dce5f7]/90 bg-white/90 backdrop-blur-xl">
      <div className="tm-shell">
        <div className="flex h-16 justify-between items-center gap-2">
          <div className="flex items-center">
            <Link href="/" className="text-[1.45rem] font-black text-blue-700 tracking-tight">
              TicoMarket
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f83ad] w-5 h-5" />
              <input
                type="text"
                placeholder="Search in Costa Rica..."
                className="tm-input pl-10 rounded-full"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search listings"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onOpenSellModal}
              className="tm-btn tm-btn-primary rounded-full text-[0.7rem] sm:text-[0.8rem] px-3.5 sm:px-4"
            >
              <PlusCircle className="w-4 h-4" />{' '}
              <span className="hidden sm:inline">Sell Something</span>
              <span className="sm:hidden">Sell</span>
            </button>

            {user && (
              <Link href="/account" className="relative p-3 text-[#60749f] hover:bg-[#edf2ff] rounded-full transition-colors">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <div className="relative group">
              <button
                onClick={() => !user && onOpenAuthModal()}
                className="p-2.5 text-[#60749f] hover:bg-[#edf2ff] rounded-full transition-colors flex items-center gap-2"
                aria-label={user ? 'Account menu' : 'Sign in'}
              >
                <div className="w-8 h-8 rounded-full bg-[#edf2ff] flex items-center justify-center text-[#60749f] overflow-hidden">
                  {user ? (
                    <span className="font-bold text-blue-700">
                      {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'U'}
                    </span>
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                {user && (
                  <span className="hidden sm:inline font-bold text-sm text-[#334d80]">
                    {user.name ? user.name.split(' ')[0] : 'User'}
                  </span>
                )}
              </button>

              {user && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-[#dce5f7] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                  <Link
                    href="/account"
                    className="w-full flex items-center gap-2 p-3 text-[#334d80] font-bold text-sm hover:bg-[#f5f8ff] rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4" /> My Account
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 p-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2.5 text-[#60749f] hover:bg-[#edf2ff] rounded-full transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
