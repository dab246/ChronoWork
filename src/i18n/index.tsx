import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { Language } from '../types';
import { vi, type Translations } from './vi';
import { en } from './en';
import { fr } from './fr';

export type { Translations };

const TRANSLATIONS: Record<Language, Translations> = { vi, en, fr };

export function getTranslations(lang: Language): Translations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

interface I18nValue {
  lang: Language;
  t: Translations;
}

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider: React.FC<{ lang: Language; children: React.ReactNode }> = ({ lang, children }) => {
  const value = useMemo(() => ({ lang, t: getTranslations(lang) }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${value.t.common.appName} – ${value.t.footer.tagline}`;
  }, [lang, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
