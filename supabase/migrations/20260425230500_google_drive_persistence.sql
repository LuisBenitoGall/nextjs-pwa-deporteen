-- Google Drive durable connection + media provider preferences

create table if not exists public.google_drive_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  scope text,
  token_type text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_refresh_at timestamptz,
  last_error text,
  status text not null default 'connected'
    check (status in ('connected', 'reconnect-required', 'disconnected'))
);

create table if not exists public.media_storage_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'local'
    check (provider in ('local', 'drive', 'r2', 'supabase')),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_connections enable row level security;
alter table public.media_storage_preferences enable row level security;

drop policy if exists "google_drive_connections_owner_select" on public.google_drive_connections;
create policy "google_drive_connections_owner_select"
  on public.google_drive_connections for select
  using (auth.uid() = user_id);

drop policy if exists "google_drive_connections_owner_insert" on public.google_drive_connections;
create policy "google_drive_connections_owner_insert"
  on public.google_drive_connections for insert
  with check (auth.uid() = user_id);

drop policy if exists "google_drive_connections_owner_update" on public.google_drive_connections;
create policy "google_drive_connections_owner_update"
  on public.google_drive_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "google_drive_connections_owner_delete" on public.google_drive_connections;
create policy "google_drive_connections_owner_delete"
  on public.google_drive_connections for delete
  using (auth.uid() = user_id);

drop policy if exists "media_storage_preferences_owner_select" on public.media_storage_preferences;
create policy "media_storage_preferences_owner_select"
  on public.media_storage_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "media_storage_preferences_owner_insert" on public.media_storage_preferences;
create policy "media_storage_preferences_owner_insert"
  on public.media_storage_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "media_storage_preferences_owner_update" on public.media_storage_preferences;
create policy "media_storage_preferences_owner_update"
  on public.media_storage_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
