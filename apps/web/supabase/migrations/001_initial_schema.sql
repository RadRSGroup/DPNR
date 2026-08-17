-- Decision Room: Initial Schema
-- Run this in your Supabase SQL editor

-- User profiles (extends Supabase auth.users)
create table public.user_profiles (
  user_id              uuid primary key references auth.users on delete cascade,
  tier                 text not null default 'free' check (tier in ('free', 'core', 'pro')),
  token_cap            integer not null default 10000,
  billing_period_start timestamptz not null default now(),
  grow_customer_id     text unique,
  scheduled_downgrade  text,
  downgrade_at         timestamptz,
  preferred_language   text not null default 'en' check (preferred_language in ('en', 'he')),
  created_at           timestamptz not null default now()
);

-- Decisions
create table public.decisions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null,
  subtitle     text,
  narrative    text,
  status       text not null default 'active' check (status in ('active', 'completed', 'archived')),
  current_step integer not null default 1,
  lens         text check (lens in ('pros_cons', 'fears_desires', 'values_needs')),
  review_date  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Options (always 2 per decision: A and B)
create table public.options (
  id           uuid primary key default gen_random_uuid(),
  decision_id  uuid not null references public.decisions on delete cascade,
  label        text not null check (label in ('A', 'B', 'C')),
  content      text not null,
  approved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (decision_id, label)
);

-- Step 03: Body emotion mapping
create table public.emotion_maps (
  id            uuid primary key default gen_random_uuid(),
  decision_id   uuid not null references public.decisions on delete cascade,
  body_location text,
  emotion_color text,
  ai_reflection text,
  user_response text check (user_response in ('accurate', 'refine', 'not_sure', 'partly_true')),
  created_at    timestamptz not null default now()
);

-- Steps 05–06: Tags per option
create table public.option_tags (
  id           uuid primary key default gen_random_uuid(),
  option_id    uuid not null references public.options on delete cascade,
  tag_type     text not null check (tag_type in ('pro', 'con', 'desire', 'fear', 'value', 'need')),
  label        text not null,
  ai_suggested boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Step 07: Future projections
create table public.projections (
  id           uuid primary key default gen_random_uuid(),
  option_id    uuid not null references public.options on delete cascade,
  statement    text not null,
  selected     boolean not null default false,
  is_custom    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Post-flow: Outcome tracking
create table public.outcomes (
  id               uuid primary key default gen_random_uuid(),
  decision_id      uuid not null references public.decisions on delete cascade,
  chosen_option_id uuid references public.options,
  reflection       text,
  created_at       timestamptz not null default now()
);

-- Token usage log
create table public.token_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  decision_id  uuid references public.decisions on delete set null,
  step         text,
  call_type    text,
  tokens_used  integer not null,
  created_at   timestamptz not null default now()
);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.user_profiles  enable row level security;
alter table public.decisions       enable row level security;
alter table public.options         enable row level security;
alter table public.emotion_maps    enable row level security;
alter table public.option_tags     enable row level security;
alter table public.projections     enable row level security;
alter table public.outcomes        enable row level security;
alter table public.token_usage     enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users own their profile"     on public.user_profiles  for all using (auth.uid() = user_id);
create policy "Users own their decisions"   on public.decisions       for all using (auth.uid() = user_id);
create policy "Users own their token usage" on public.token_usage     for all using (auth.uid() = user_id);

create policy "Users own their options" on public.options
  for all using (
    exists (select 1 from public.decisions d where d.id = decision_id and d.user_id = auth.uid())
  );

create policy "Users own their emotion maps" on public.emotion_maps
  for all using (
    exists (select 1 from public.decisions d where d.id = decision_id and d.user_id = auth.uid())
  );

create policy "Users own their tags" on public.option_tags
  for all using (
    exists (
      select 1 from public.options o
      join public.decisions d on d.id = o.decision_id
      where o.id = option_id and d.user_id = auth.uid()
    )
  );

create policy "Users own their projections" on public.projections
  for all using (
    exists (
      select 1 from public.options o
      join public.decisions d on d.id = o.decision_id
      where o.id = option_id and d.user_id = auth.uid()
    )
  );

create policy "Users own their outcomes" on public.outcomes
  for all using (
    exists (select 1 from public.decisions d where d.id = decision_id and d.user_id = auth.uid())
  );
