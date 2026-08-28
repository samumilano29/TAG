import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLanguage, setLanguage as storeLanguage, type Language, type TranslationKey, t } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => getLanguage());

  const setLang = useCallback((newLang: Language) => {
    storeLanguage(newLang);
    setLangState(newLang);
  }, []);

  const translate = useCallback((key: TranslationKey) => t(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
