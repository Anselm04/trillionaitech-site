/**
 * Trillion AI Tech - Mobile Controls Sync
 * Syncs header controls with secondary mobile controls bar
 */

(function() {
  'use strict';

  // Sync language selectors
  const langSelector = document.getElementById('language-selector');
  const langSelectorMobile = document.getElementById('language-selector-mobile');

  if (langSelector && langSelectorMobile) {
    // Sync initial value
    langSelectorMobile.value = langSelector.value;

    // Sync changes from header to mobile bar
    langSelector.addEventListener('change', function() {
      langSelectorMobile.value = this.value;
    });

    // Sync changes from mobile bar to header
    langSelectorMobile.addEventListener('change', function() {
      langSelector.value = this.value;
    });
  }

  // Sync theme toggles
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');

  if (themeToggle && themeToggleMobile) {
    // Sync click events
    themeToggleMobile.addEventListener('click', function() {
      themeToggle.click();
    });
  }
})();
