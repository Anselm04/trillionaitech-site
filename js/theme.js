/**
 * Trillion AI Tech - Theme Toggle System
 * FIXED: Properly toggles between light/dark modes
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'trillion_theme';
  const DEFAULT_THEME = 'dark';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return DEFAULT_THEME;
  }

  function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function updateIcons(theme) {
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');
    
    if (!sunIcon || !moonIcon) return;
    
    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }

  function init() {
    const theme = getPreferredTheme();
    applyTheme(theme);
    updateIcons(theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        saveTheme(newTheme);
        updateIcons(newTheme);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
