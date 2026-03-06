'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { withCsrfHeaders } from '@/lib/csrf';

type TranslateContext = 'listing' | 'message' | 'generic';

interface TranslatableTextProps {
  text: string;
  context?: TranslateContext;
  textClassName?: string;
  metaClassName?: string;
  translatedMetaClassName?: string;
  buttonClassName?: string;
}

export function TranslatableText({
  text,
  context = 'generic',
  textClassName = '',
  metaClassName = '',
  translatedMetaClassName = '',
  buttonClassName = '',
}: TranslatableTextProps) {
  const { locale } = useI18n();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isShowingTranslation, setIsShowingTranslation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetLanguage = locale === 'es' ? 'es' : 'en';
  const translateLabel = locale === 'es' ? 'Traducir' : 'Translate';
  const originalLabel = locale === 'es' ? 'Ver original' : 'Show original';
  const translatedLabel = locale === 'es' ? 'Traducido al espanol' : 'Translated to English';

  const handleToggleTranslation = async () => {
    if (translatedText) {
      setIsShowingTranslation((current) => !current);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          text,
          targetLanguage,
          context,
        }),
      });

      const payload = await res.json().catch(() => ({} as { error?: string; translatedText?: string }));
      if (!res.ok || !payload.translatedText) {
        throw new Error(payload.error || 'Translation unavailable');
      }

      setTranslatedText(payload.translatedText);
      setIsShowingTranslation(true);
    } catch (translateError) {
      setError(translateError instanceof Error ? translateError.message : 'Translation unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedText = isShowingTranslation && translatedText ? translatedText : text;

  return (
    <div className="space-y-2">
      <div className={textClassName}>{displayedText}</div>
      <div className={`flex items-center gap-2 text-[11px] font-bold ${metaClassName}`}>
        <button
          type="button"
          onClick={() => {
            void handleToggleTranslation();
          }}
          disabled={isLoading}
          className={`inline-flex items-center gap-1 rounded-full transition-colors disabled:opacity-60 ${buttonClassName}`}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
          {translatedText && isShowingTranslation ? originalLabel : translateLabel}
        </button>
        {translatedText && isShowingTranslation && (
          <span className={translatedMetaClassName}>{translatedLabel}</span>
        )}
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
