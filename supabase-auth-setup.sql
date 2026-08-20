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

drop function if exists login(text, text);
create function login(p_email text, p_password text)
returns table (id uuid, name text, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select a.id, a.name, a.role
  from accounts a
  where a.email = lower(trim(p_email))
    and a.password_hash = extensions.crypt(p_password, a.password_hash)
  limit 1;
$$;

revoke all on function login(text, text) from public;
grant execute on function login(text, text) to anon;

-- ── Owner-only account management (used by the in-app "Team" page) ─────────────
-- There's still no Supabase Auth session in this app (see the RLS note above), so
-- these functions re-verify the caller's own email+password on every call and
-- require role = 'owner' before doing anything — that's the only thing standing
-- between "anyone with the anon key" and "can rewrite the accounts table". Never
-- returns password_hash to the client.

create or replace function admin_list_accounts(p_email text, p_password text)
returns table (id uuid, email text, role text, name text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from accounts a
    where a.email = lower(trim(p_email))
      and a.password_hash = extensions.crypt(p_password, a.password_hash)
      and a.role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  return query
    select a.id, a.email, a.role, a.name, a.created_at
    from accounts a
    order by a.created_at asc;
end;
$$;

revoke all on function admin_list_accounts(text, text) from public;
grant execute on function admin_list_accounts(text, text) to anon;

-- p_target_id: null to create a new account, or an existing account's id to edit it.
-- p_target_password: '' (empty string) on edit means "keep the current password".
create or replace function admin_upsert_account(
  p_email text,
  p_password text,
  p_target_id uuid,
  p_target_email text,
  p_target_password text,
  p_target_role text,
  p_target_name text
)
returns table (id uuid, email text, role text, name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_owner_count int;
  v_current_role text;
begin
  if not exists (
    select 1 from accounts a
    where a.email = lower(trim(p_email))
      and a.password_hash = extensions.crypt(p_password, a.password_hash)
      and a.role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  if p_target_role not in ('owner', 'staff') then
    raise exception 'Invalid role';
  end if;

  if p_target_id is null then
    if p_target_password is null or length(p_target_password) < 6 then
      raise exception 'Password must be at least 6 characters';
    end if;
    insert into accounts (email, password_hash, role, name)
    values (lower(trim(p_target_email)), extensions.crypt(p_target_password, extensions.gen_salt('bf')), p_target_role, p_target_name)
    returning accounts.id into v_id;
  else
    select role into v_current_role from accounts where id = p_target_id;
    if v_current_role is null then
      raise exception 'Account not found';
    end if;

    -- Block demoting the last remaining owner — that would lock everyone out.
    if v_current_role = 'owner' and p_target_role <> 'owner' then
      select count(*) into v_owner_count from accounts where role = 'owner';
      if v_owner_count <= 1 then
        raise exception 'Cannot change the role of the last owner account';
      end if;
    end if;

    if p_target_password is not null and length(p_target_password) > 0 and length(p_target_password) < 6 then
      raise exception 'Password must be at least 6 characters';
    end if;

    update accounts a
    set
      email = lower(trim(p_target_email)),
      role = p_target_role,
      name = p_target_name,
      password_hash = case
        when p_target_password is not null and length(p_target_password) > 0
          then extensions.crypt(p_target_password, extensions.gen_salt('bf'))
        else a.password_hash
      end
    where a.id = p_target_id;

    v_id := p_target_id;
  end if;

  return query select a.id, a.email, a.role, a.name from accounts a where a.id = v_id;
end;
$$;

revoke all on function admin_upsert_account(text, text, uuid, text, text, text, text) from public;
grant execute on function admin_upsert_account(text, text, uuid, text, text, text, text) to anon;

create or replace function admin_delete_account(p_email text, p_password text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner_count int;
  v_target_role text;
begin
  if not exists (
    select 1 from accounts a
    where a.email = lower(trim(p_email))
      and a.password_hash = extensions.crypt(p_password, a.password_hash)
      and a.role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  select role into v_target_role from accounts where id = p_target_id;
  if v_target_role is null then
    raise exception 'Account not found';
  end if;

  if v_target_role = 'owner' then
    select count(*) into v_owner_count from accounts where role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'Cannot delete the last owner account';
    end if;
  end if;

  delete from accounts where id = p_target_id;
end;
$$;

revoke all on function admin_delete_account(text, text, uuid) from public;
grant execute on function admin_delete_account(text, text, uuid) to anon;

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

-- ── Managing accounts later ─────────────────────────────────────────────────
-- Day to day, use the in-app "Team" page (owner-only) — it calls
-- admin_list_accounts / admin_upsert_account / admin_delete_account above. These
-- raw queries are a fallback for if you're ever in the SQL Editor directly.

-- Add a new account (role is 'owner' or 'staff'):
-- insert into accounts (email, password_hash, role, name) values
--   ('newperson@example.com', extensions.crypt('theirNewPassword', extensions.gen_salt('bf')), 'staff', 'New Person Name');

-- Change someone's password:
-- update accounts
-- set password_hash = extensions.crypt('theNewPassword', extensions.gen_salt('bf'))
-- where email = 'someone@example.com';

-- Change someone's role or display name:
-- update accounts set role = 'owner', name = 'New Display Name' where email = 'someone@example.com';

-- Remove an account:
-- delete from accounts where email = 'someone@example.com';
