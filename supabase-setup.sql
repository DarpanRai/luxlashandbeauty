-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Creates a simple key/value table that mirrors the app's existing local storage
-- shape exactly — one row per data collection (customers, products, services, etc.),
-- each holding its whole array as JSON. This keeps every component in the app
-- working unchanged; only the storage backend underneath swaps out.

create table if not exists app_storage (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is on by default for new tables via the dashboard, but make it
-- explicit. This app has no Supabase Auth wired in (it uses its own separate hardcoded
-- login, unrelated to Supabase) — so the anon/publishable key itself must be allowed to
-- read and write this table directly. That key ships inside the browser bundle, so
-- anyone with it could read or write this table; that's an inherent tradeoff of a
-- client-only app talking straight to Supabase with no backend in front of it, not a
-- bug in this policy. If that ever needs locking down further, the fix is adding a real
-- backend (or Supabase Auth) in front of this table, not tightening this policy alone.
alter table app_storage enable row level security;

drop policy if exists "app_storage_anon_all" on app_storage;
create policy "app_storage_anon_all"
  on app_storage
  for all
  to anon
  using (true)
  with check (true);
