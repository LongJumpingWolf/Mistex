-- Mistex cloud sync schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
--
-- Design: each mistake and each user's settings blob is stored as JSON in a
-- `payload` column, mirroring exactly what's already in localStorage today.
-- This means the app's data shape can keep evolving (new fields on a
-- mistake, new settings) without ever needing another migration here.

create table if not exists public.mistakes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: every user can only ever see/touch their own rows.
alter table public.mistakes enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can view their own mistakes"
  on public.mistakes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own mistakes"
  on public.mistakes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own mistakes"
  on public.mistakes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own mistakes"
  on public.mistakes for delete
  using (auth.uid() = user_id);

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Helpful index for pulling a user's whole mistake set on sign-in.
create index if not exists mistakes_user_id_idx on public.mistakes(user_id);
