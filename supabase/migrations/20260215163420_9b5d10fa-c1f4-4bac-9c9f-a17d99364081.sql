
-- Election config table (singleton)
CREATE TABLE public.election_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT false,
  results_revealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default config row
INSERT INTO public.election_config (is_open, results_revealed) VALUES (false, false);

-- Members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number TEXT NOT NULL UNIQUE,
  id_card_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  fee_status TEXT NOT NULL DEFAULT 'pending' CHECK (fee_status IN ('paid', 'pending')),
  has_voted BOOLEAN NOT NULL DEFAULT false,
  ethics_accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_member_number ON public.members(member_number);

-- Candidates table (aggregate vote counts stored directly)
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  president_votes INTEGER NOT NULL DEFAULT 0,
  member_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session tokens table for custom auth
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('member', 'admin')),
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON public.sessions(token);

-- Enable RLS on all tables
ALTER TABLE public.election_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Since all data access goes through edge functions using service role key,
-- we don't need permissive RLS policies for anon/authenticated roles.
-- Edge functions bypass RLS with service role.
-- We add restrictive policies to block direct client access.

-- Election config: readable by anyone (public info about election status)
CREATE POLICY "Anyone can read election config" ON public.election_config
  FOR SELECT USING (true);

-- Candidates: readable by anyone (public gallery)
CREATE POLICY "Anyone can read candidates" ON public.candidates
  FOR SELECT USING (true);

-- All other tables: no direct client access (edge functions use service role)
-- Members, admin_users, sessions: no policies = no access from client

-- Create storage bucket for candidate photos
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true);

-- Allow public read access to candidate photos
CREATE POLICY "Public can view candidate photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'candidate-photos');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_election_config_updated_at
  BEFORE UPDATE ON public.election_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
