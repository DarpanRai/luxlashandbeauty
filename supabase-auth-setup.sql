-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Moves login credentials out of the frontend source code (they were previously
-- hardcoded in src/constants/accounts.js, visible to anyone who can see this public
-- repo or the deployed JS bundle) and into Postgres instead.
--
-- Security note: the anon/publishable key ships inside the browser bundle (same as
-- app_storage), so putting a plain readable table behind it would just move the
-- exposure from GitHub to the Supabase REST API — not actually fix it. Instead this
-- table has RLS enabled with zero policies (denies all direct access to the anon
-- key), and the only way in is the login() function below: SECURITY DEFINER (runs
-- with the table owner's privileges, bypassing RLS) and it only ever returns a
-- name/role on a match, never the password or its hash. Passwords are stored
-- bcrypt-hashed via pgcrypto, never in plaintext.

create extension if not exists pgcrypto with schema extensions;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('owner', 'staff')),
  name text not null,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;
-- Deliberately no policies — RLS with zero policies denies all direct SELECT/
-- INSERT/UPDATE/DELETE to the anon key. Only the SECURITY DEFINER function below
-- can read this table.

create or replace function login(p_email text, p_password text)
returns table (name text, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select a.name, a.role
  from accounts a
  where a.email = lower(trim(p_email))
    and a.password_hash = extensions.crypt(p_password, a.password_hash)
  limit 1;
$$;

revoke all on function login(text, text) from public;
grant execute on function login(text, text) to anon;

-- Seed the existing accounts (bcrypt-hashes the password on insert).
-- Safe to re-run: ON CONFLICT updates password/role/name instead of erroring.
-- The old TEMP test@gmail.com account is intentionally dropped here — its own
-- comment in accounts.js said "delete before real use."
insert into accounts (email, password_hash, role, name) values
  ('ankitapaudel33@gmail.com', extensions.crypt('callM3Baby', extensions.gen_salt('bf')), 'owner', 'Ankita Paudel'),
  ('luxlashandbrows330@gmail.com', extensions.crypt('luxlash@123', extensions.gen_salt('bf')), 'staff', 'LuxLash & Brows Staff')
on conflict (email) do update set
  password_hash = excluded.password_hash,
  role = excluded.role,
  name = excluded.name;
