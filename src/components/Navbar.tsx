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
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight">
              TicoMarket
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search in Costa Rica..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onOpenSellModal}
              className="flex items-center gap-1 bg-blue-600 text-white font-bold px-4 py-2 rounded-full transition-all text-xs sm:text-sm active:scale-95 shadow-lg shadow-blue-100"
            >
              <PlusCircle className="w-4 h-4" />{' '}
              <span className="hidden sm:inline">Sell Something</span>
              <span className="sm:hidden">Sell</span>
            </button>

            {user && (
              <Link href="/account" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <div className="relative group">
              <button
                onClick={() => !user && onOpenAuthModal()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                aria-label={user ? 'Account menu' : 'Sign in'}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
                  {user ? (
                    <span className="font-bold text-blue-600">{user.name[0]}</span>
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                {user && (
                  <span className="hidden sm:inline font-bold text-sm text-gray-700">
                    {user.name.split(' ')[0]}
                  </span>
                )}
              </button>

              {user && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                  <Link
                    href="/account"
                    className="w-full flex items-center gap-2 p-3 text-gray-700 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors"
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
              className="md:hidden p-2 text-gray-600"
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
