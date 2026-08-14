-- Trillion AI Tech - Supabase Database Schema
-- This file contains all database migrations for the authentication system

-- Marketing preferences table
CREATE TABLE IF NOT EXISTS public.marketing_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_marketing_opt_in boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL CHECK (event_name IN ('page_view','sign_up','sign_in','sign_out','marketing_opt_in','marketing_opt_out','navigation_interaction','product_interaction')),
  page_path text NOT NULL CHECK (char_length(page_path) <= 500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Enable Row Level Security
ALTER TABLE public.marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin check function
CREATE OR REPLACE FUNCTION public.is_trillion_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_trillion_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'display_name','')), ''), split_part(NEW.email, '@', 1)), now(), now())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
  INSERT INTO public.marketing_preferences (user_id, email_marketing_opt_in, consented_at, updated_at)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, false), CASE WHEN COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, false) THEN now() ELSE NULL END, now())
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'anselm.perkins@gmail.com' THEN 'admin' ELSE 'user' END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_trillion_auth_user_created ON auth.users;
CREATE TRIGGER on_trillion_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_trillion_auth_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_trillion_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_trillion_updated_at();
DROP TRIGGER IF EXISTS marketing_preferences_set_updated_at ON public.marketing_preferences;
CREATE TRIGGER marketing_preferences_set_updated_at BEFORE UPDATE ON public.marketing_preferences FOR EACH ROW EXECUTE FUNCTION public.set_trillion_updated_at();

-- RLS Policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "marketing_select_own" ON public.marketing_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "marketing_update_own" ON public.marketing_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "analytics_insert_safe" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "analytics_select_admin" ON public.analytics_events FOR SELECT TO authenticated USING (public.is_trillion_admin());
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin stats function
CREATE OR REPLACE FUNCTION public.get_trillion_admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_trillion_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users_30_days', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'marketing_opt_ins', (SELECT count(*) FROM public.marketing_preferences WHERE email_marketing_opt_in),
    'marketing_opt_outs', (SELECT count(*) FROM public.marketing_preferences WHERE NOT email_marketing_opt_in),
    'page_views', (SELECT count(*) FROM public.analytics_events WHERE event_name = 'page_view'),
    'sign_ins', (SELECT count(*) FROM public.analytics_events WHERE event_name = 'sign_in'),
    'sign_ups', (SELECT count(*) FROM public.analytics_events WHERE event_name = 'sign_up')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_trillion_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trillion_admin_stats() TO authenticated;
