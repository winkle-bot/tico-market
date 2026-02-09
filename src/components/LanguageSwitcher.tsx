'use client';

import { useI18n } from '@/context/I18nContext';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center rounded-full border border-[#dce5f7] bg-[#f5f8ff] p-1">
      <span className="sr-only">{t('navbar.language')}</span>
      <button
        type="button"
        onClick={() => setLocale('es')}
        aria-pressed={locale === 'es'}
        className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition-colors ${
          locale === 'es' ? 'bg-blue-600 text-white' : 'text-[#60749f] hover:bg-[#e7eeff]'
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition-colors ${
          locale === 'en' ? 'bg-blue-600 text-white' : 'text-[#60749f] hover:bg-[#e7eeff]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
