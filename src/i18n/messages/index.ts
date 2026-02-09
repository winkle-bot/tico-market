import en from './en';
import es from './es';

export type Locale = 'en' | 'es';
export type Messages = Record<string, string>;

export const messagesByLocale: Record<Locale, Messages> = {
  en,
  es,
};

export const DEFAULT_LOCALE: Locale = 'es';
