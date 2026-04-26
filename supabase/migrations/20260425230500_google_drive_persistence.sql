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

alter table public.match_media
  add column if not exists storage_provider text
    check (storage_provider in ('local', 'drive', 'r2', 'supabase')),
  add column if not exists google_drive_file_id text;

-- Conservative migration for existing rows.
update public.match_media
set storage_provider = case
  when storage_path like 'drive:%' then 'drive'
  when storage_path like 'r2:%' then 'r2'
  when storage_path is not null then 'supabase'
  when device_uri is not null then 'local'
  else coalesce(storage_provider, 'local')
end
where storage_provider is null;

update public.match_media
set google_drive_file_id = substring(storage_path from 7)
where google_drive_file_id is null
  and storage_path like 'drive:%';

alter table public.match_media
  alter column storage_provider set default 'local';

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
