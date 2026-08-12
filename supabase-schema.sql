-- Trillion AI Tech — Supabase Database Schema
-- This schema defines the user profiles and marketing consent tables.
-- IMPORTANT: This must be run in your Supabase project's SQL editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
-- Stores additional user information beyond Supabase auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT,
    email TEXT NOT NULL,
    preferred_language TEXT DEFAULT 'en' NOT NULL,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Marketing consent table
-- Stores marketing communication preferences separately from authentication
CREATE TABLE IF NOT EXISTS public.marketing_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    marketing_consent BOOLEAN DEFAULT FALSE NOT NULL,
    marketing_consent_given_at TIMESTAMP WITH TIME ZONE,
    marketing_consent_withdrawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_consent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can only view and update their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for marketing_consent
-- Users can only view and update their own marketing consent
CREATE POLICY "Users can view own marketing consent"
    ON public.marketing_consent
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own marketing consent"
    ON public.marketing_consent
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketing consent"
    ON public.marketing_consent
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, first_name, last_name, preferred_language)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
    );
    
    -- Create marketing consent record (default: no consent)
    INSERT INTO public.marketing_consent (user_id, marketing_consent)
    VALUES (NEW.id, FALSE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER marketing_consent_updated_at
    BEFORE UPDATE ON public.marketing_consent
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_marketing_consent_user_id ON public.marketing_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_consent_consent ON public.marketing_consent(marketing_consent);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.marketing_consent TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at TO authenticated;
