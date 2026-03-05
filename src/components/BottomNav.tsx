'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ShoppingBag, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';

const HIDDEN_PATHS = ['/admin', '/drivers/apply', '/drivers/verify', '/auth'];

export function BottomNav({ onSell, onAuth }: { onSell: () => void; onAuth: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();

  // Hide on certain pages
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  // Hide on listing detail (full-screen experience)
  if (pathname.startsWith('/listing/')) return null;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors min-w-[48px] min-h-[44px] justify-center ${isActive(path) ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
    }`;

  const handleSellClick = () => {
    if (!user) {
      onAuth();
      return;
    }
    onSell();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around px-2 h-14">
        <Link href="/" className={linkClass('/')}>
          <Home className="w-5 h-5" />
          <span>{t('nav.home') || 'Home'}</span>
        </Link>

        <Link href="/ferias" className={linkClass('/ferias')}>
          <ShoppingBag className="w-5 h-5" />
          <span>{t('nav.ferias') || 'Ferias'}</span>
        </Link>

        <button
          onClick={handleSellClick}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-green-600 min-w-[48px] min-h-[44px] justify-center"
        >
          <PlusCircle className="w-7 h-7" />
          <span>{t('nav.sell') || 'Sell'}</span>
        </button>

        <Link href="/account" className={linkClass('/account')}>
          <MessageCircle className="w-5 h-5" />
          <span>{t('nav.messages') || 'Messages'}</span>
        </Link>

        <Link href="/account" className={linkClass('/account')}>
          <User className="w-5 h-5" />
          <span>{t('nav.account') || 'Account'}</span>
        </Link>
      </div>
    </div>
  );
}
