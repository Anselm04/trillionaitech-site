/**
 * Trillion AI Tech - Supabase Client
 * Initialize Supabase with environment variables
 */

// These will be populated from environment variables in production
const SUPABASE_URL = 'https://frqhtntzwwzcrcyewtxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycWh0bnR6d3d6Y3JjeWV3dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjI1OTUsImV4cCI6MjEwMTIzODU5NX0.6zu-nlAg_2taH58z2TlXe7tDP3Uoartlrt6Il-sdtEc';

// Create Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export for use in other scripts
window.TrillionSupabase = supabase;

// Helper functions for analytics
window.TrillionAnalytics = {
  trackEvent: async function(eventName, pagePath, metadata = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        event_name: eventName,
        page_path: pagePath,
        metadata: metadata
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }
};

// Track page views
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.TrillionAnalytics.trackEvent('page_view', window.location.pathname);
  });
}
