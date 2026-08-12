/**
 * Trillion AI Tech - Internationalization (i18n) System
 * Supports dynamic locale loading with localStorage persistence
 */

(function() {
  'use strict';

  const SUPPORTED_LOCALES = ['en', 'mi', 'es', 'fr'];
  const DEFAULT_LOCALE = 'en';
  const STORAGE_KEY = 'trillion_locale';

  let currentLocale = DEFAULT_LOCALE;
  let translations = {};

  function getPreferredLocale() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      return browserLang;
    }
    return DEFAULT_LOCALE;
  }

  function saveLocale(locale) {
    localStorage.setItem(STORAGE_KEY, locale);
  }

  async function loadLocale(locale) {
    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale: ${locale}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading locale ${locale}:`, error);
      if (locale !== DEFAULT_LOCALE) {
        return loadLocale(DEFAULT_LOCALE);
      }
      return {};
    }
  }

  function getTranslation(translations, keyPath) {
    const keys = keyPath.split('.');
    let value = translations;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    return typeof value === 'string' ? value : null;
  }

  function translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = getTranslation(translations, key);
      if (translation) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });
  }

  function updateLanguageSelector() {
    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = currentLocale;
    }
  }

  function setDocumentLanguage(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }

  async function init() {
    currentLocale = getPreferredLocale();
    translations = await loadLocale(currentLocale);
    setDocumentLanguage(currentLocale);
    translatePage();
    updateLanguageSelector();

    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.addEventListener('change', async (event) => {
        const newLocale = event.target.value;
        if (SUPPORTED_LOCALES.includes(newLocale)) {
          currentLocale = newLocale;
          saveLocale(currentLocale);
          translations = await loadLocale(currentLocale);
          setDocumentLanguage(currentLocale);
          translatePage();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TrillionI18n = {
    getLocale: () => currentLocale,
    getTranslations: () => translations,
    reloadLocale: async () => {
      translations = await loadLocale(currentLocale);
      translatePage();
    }
  };
})();
