/**
 * Trillion AI Tech — Supabase Client Configuration
 * 
 * IMPORTANT: This file uses environment variables for configuration.
 * You MUST create a .env file (not committed) with:
 * 
 * NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 
 * NEVER commit your Supabase service-role key to the repository.
 */

// Supabase CDN
const SUPABASE_URL = 'https://your-project-id.supabase.co'; // Replace with actual project URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with actual anon key

// Initialize Supabase client (will be created when credentials are provided)
let supabase = null;

function initSupabase() {
    if (typeof window !== 'undefined' && typeof supabase !== 'undefined') {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
    }
}

// Auth functions
async function signUp({ email, password, firstName, lastName, marketingConsent }) {
    if (!supabase) {
        throw new Error('Supabase not configured. Please set up your Supabase project.');
    }
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                marketing_consent: marketingConsent || false
            }
        }
    });
    
    if (error) throw error;
    return data;
}

async function signIn({ email, password }) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    return data;
}

async function signOut() {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function resetPassword(email) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
    });
    
    if (error) throw error;
}

async function updatePassword(newPassword) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    
    if (error) throw error;
    return data;
}

// Get current user
function getCurrentUser() {
    if (!supabase) return null;
    return supabase.auth.getUser();
}

// Listen to auth changes
function onAuthStateChange(callback) {
    if (!supabase) return;
    supabase.auth.onAuthStateChange(callback);
}

// Profile functions
async function getProfile(userId) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

async function updateProfile(userId, updates) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);
    
    if (error) throw error;
    return data;
}

// Marketing consent functions
async function getMarketingConsent(userId) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase
        .from('marketing_consent')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

async function updateMarketingConsent(userId, consent) {
    if (!supabase) {
        throw new Error('Supabase not configured.');
    }
    
    const { data, error } = await supabase
        .from('marketing_consent')
        .update({
            marketing_consent: consent,
            marketing_consent_given_at: consent ? new Date().toISOString() : null,
            marketing_consent_withdrawn_at: !consent ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    
    if (error) throw error;
    return data;
}

// Initialize on load
if (typeof window !== 'undefined') {
    initSupabase();
}

// Export for use in other files
window.TrillionSupabase = {
    initSupabase,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    getCurrentUser,
    onAuthStateChange,
    getProfile,
    updateProfile,
    getMarketingConsent,
    updateMarketingConsent
};
