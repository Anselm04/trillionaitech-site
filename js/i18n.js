/**
 * Trillion AI Tech - i18n System
 * FIXED: Properly loads and applies translations with correct encoding
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'trillion_language';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = ['en', 'mi', 'es', 'fr'];

  let currentLocale = {};

  function getPreferredLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      return stored;
    }
    return DEFAULT_LANG;
  }

  function saveLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
  }

  async function loadLocale(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale: ${lang}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading locale:', error);
      return {};
    }
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  function translatePage(locale) {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNestedValue(locale, key);
      
      if (value !== undefined && value !== null) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = value;
        } else if (el.tagName === 'META') {
          el.setAttribute('content', value);
        } else {
          el.textContent = value;
        }
      }
    });

    // Update html lang attribute
    document.documentElement.lang = Object.keys(locale).length > 0 ? 
      document.getElementById('language-selector')?.value || DEFAULT_LANG : DEFAULT_LANG;
  }

  async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      lang = DEFAULT_LANG;
    }

    currentLocale = await loadLocale(lang);
    
    if (Object.keys(currentLocale).length > 0) {
      translatePage(currentLocale);
      saveLanguage(lang);
      
      // Update all selectors
      const selector = document.getElementById('language-selector');
      const selectorMobile = document.getElementById('language-selector-mobile');
      
      if (selector) {
        selector.value = lang;
      }
      if (selectorMobile) {
        selectorMobile.value = lang;
      }
    }
  }

  function init() {
    const lang = getPreferredLanguage();
    setLanguage(lang);

    // Setup header selector
    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = lang;
      selector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }

    // Setup mobile bar selector
    const selectorMobile = document.getElementById('language-selector-mobile');
    if (selectorMobile) {
      selectorMobile.value = lang;
      selectorMobile.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.TrillionI18n = {
    setLanguage,
    currentLocale
  };
})();
