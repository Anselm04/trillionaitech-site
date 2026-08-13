/**
 * Trillion AI Tech - Supabase Client
 * Initialize Supabase with environment variables
 */

// These will be populated from environment variables in production
const SUPABASE_URL = window.location.hostname === 'localhost' 
  ? 'YOUR_SUPABASE_URL' 
  : (process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL');

const SUPABASE_ANON_KEY = window.location.hostname === 'localhost'
  ? 'YOUR_SUPABASE_ANON_KEY'
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY');

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
