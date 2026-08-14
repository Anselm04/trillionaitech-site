import { api } from './api';

// Fire-and-forget analytics tracking. Never blocks the UI.
export function track(name, props = {}) {
  try {
    api.post('/events', {
      name,
      props,
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    }).catch(() => {});
  } catch { /* noop */ }
}

export function trackPageView(pathname) {
  track('page_view', { path: pathname });
}
