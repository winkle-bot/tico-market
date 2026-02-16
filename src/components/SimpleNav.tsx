import Link from 'next/link';

export function SimpleNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="tm-shell flex items-center justify-between h-16">
        <Link href="/" className="text-xl font-black text-gray-900 tracking-tight">
          TicoMarket
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/ferias" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            Ferias
          </Link>
          <Link href="/" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            Browse
          </Link>
        </div>
      </div>
    </nav>
  );
}
