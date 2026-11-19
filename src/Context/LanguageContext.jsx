import React, { createContext, useContext, useEffect } from 'react';
import { TRANSLATIONS, getLocalizedProductName, getLocalizedCategoryName } from '../utils/translations';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isEnglish: true,
  shopLanguageMode: 'en',
  defaultLanguage: 'en',
  showLanguageSwitcher: false,
  t: (key, fallback) => fallback || key,
  getProductName: (p) => p?.name || '',
  getCategoryName: (c) => c || '',
  translateDynamic: async (text) => text,
  translateBatchDynamic: async (texts) => texts,
});

export const LanguageProvider = ({ children }) => {
  useEffect(() => {
    try {
      localStorage.setItem('amardokan_language', 'en');
      if (document.documentElement) {
        document.documentElement.lang = 'en';
        document.documentElement.removeAttribute('translate');
        document.documentElement.classList.remove('notranslate');
      }
    } catch (e) {}
  }, []);

  const t = (key, fallback = '') => {
    const dict = TRANSLATIONS.en || {};
    if (dict[key] !== undefined) {
      return dict[key];
    }
    return fallback || key;
  };

  const getProductName = (product) => {
    return getLocalizedProductName(product, 'en');
  };

  const getCategoryName = (cat) => {
    return getLocalizedCategoryName(cat, 'en');
  };

  const translateDynamic = async (text) => text;
  const translateBatchDynamic = async (texts) => texts;

  return (
    <LanguageContext.Provider
      value={{
        language: 'en',
        setLanguage: () => {},
        toggleLanguage: () => {},
        isEnglish: true,
        shopLanguageMode: 'en',
        defaultLanguage: 'en',
        showLanguageSwitcher: false,
        t,
        getProductName,
        getCategoryName,
        translateDynamic,
        translateBatchDynamic,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
