-- ============================================
-- Rewound — Supabase Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the vinyls table
create table if not exists public.vinyls (
  id text primary key default gen_random_uuid()::text,
  title text not null default 'Untitled',
  artist text not null default 'Anonymous',
  vinyl_color text not null default 'black' check (vinyl_color in ('black', 'red', 'blue', 'clear')),
  audio_url text not null,
  photos jsonb not null default '[]'::jsonb,
  note_data text,
  play_count integer not null default 0,
  first_played_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.vinyls enable row level security;

-- 3. RLS policies
-- Anyone can read a vinyl (needed for shareable links)
create policy "Vinyls are publicly readable"
  on public.vinyls for select
  using (true);

-- Anyone can create a vinyl (no auth required for MVP)
create policy "Anyone can create a vinyl"
  on public.vinyls for insert
  with check (true);

-- Anyone can update play_count and first_played_at
create policy "Anyone can update play stats"
  on public.vinyls for update
  using (true)
  with check (true);

-- 4. Create storage buckets
-- Run these one at a time if they error (bucket may already exist)
insert into storage.buckets (id, name, public)
  values ('audio', 'audio', true)
  on conflict do nothing;

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict do nothing;

-- 5. Storage policies — allow public uploads and reads
-- Audio bucket
create policy "Public audio read" on storage.objects
  for select using (bucket_id = 'audio');

create policy "Public audio upload" on storage.objects
  for insert with check (
    bucket_id = 'audio'
    and (storage.extension(name) in ('webm', 'mp3', 'wav', 'ogg', 'm4a', 'mp4'))
    and octet_length(decode(replace(name, '/', ''), 'escape')) is not null
  );

-- Photos bucket
create policy "Public photos read" on storage.objects
  for select using (bucket_id = 'photos');

create policy "Public photos upload" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'))
  );

-- 6. Index for faster lookups
create index if not exists idx_vinyls_created_at on public.vinyls (created_at desc);
