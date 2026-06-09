-- Add consent tracking to user_profiles
alter table public.user_profiles
  add column if not exists consented_at timestamptz,
  add column if not exists consent_version text;
