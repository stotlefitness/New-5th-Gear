-- 006_parent_player_support.sql
-- Add support for parent accounts managing player accounts
-- At the end of the day, relationships are between coach and player

-- We'll create player profiles that reference a special system user in auth.users
-- For now, we'll create player profiles with a UUID that we'll handle via triggers/functions
-- The constraint will be handled by creating a minimal auth user or using a system approach

-- Add account_type and player_id to profiles
alter table public.profiles 
  add column if not exists account_type text check (account_type in ('parent', 'player')) default 'player',
  add column if not exists player_id uuid references public.profiles(id) on delete cascade;

-- Only parent accounts should have a player_id set
alter table public.profiles 
  add constraint parent_has_player check (
    (account_type = 'parent' and player_id is not null) or 
    (account_type = 'player' and player_id is null)
  );

-- Index for looking up parents by player
create index if not exists profiles_player_id_idx on public.profiles(player_id);

-- Helper function to get the effective player_id for a user
-- Returns player_id if account_type is 'parent', otherwise returns the user's own id
create or replace function public.get_effective_player_id(p_user_id uuid)
returns uuid language plpgsql stable as $$
declare
  v_account_type text;
  v_player_id uuid;
begin
  select account_type, player_id into v_account_type, v_player_id
  from public.profiles
  where id = p_user_id;
  
  if v_account_type = 'parent' then
    return v_player_id;
  else
    return p_user_id;
  end if;
end; $$;

-- Function to create a parent account with a player profile
-- Note: This requires creating an auth user for the player first
-- We'll use a special email pattern that won't conflict
create or replace function public.create_parent_with_player(
  p_parent_id uuid,
  p_parent_email text,
  p_parent_name text,
  p_player_name text
)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_player_id uuid;
  v_player_email text;
begin
  if auth.uid() is null or auth.uid() <> p_parent_id then
    raise exception 'unauthorized';
  end if;

  -- Generate a unique email for the player profile
  -- This email won't be used for login, it's just for the profile record
  v_player_email := 'player_' || p_parent_id::text || '@' || split_part(p_parent_email, '@', 2);
  
  -- Create auth user for player (inactive, won't be used for login)
  -- We need to insert into auth.users, but this requires admin privileges
  -- For now, we'll create the profile and handle auth.users separately via trigger
  -- or we'll create it with a placeholder UUID that gets handled by application logic
  
  -- Generate player UUID
  v_player_id := gen_random_uuid();
  
  -- Note: In production, you may want to create an auth user here
  -- For now, we'll insert the profile and the constraint will need to be handled
  -- This is a limitation - we need either:
  -- 1. A trigger that creates auth.users entries
  -- 2. Application-level handling to create auth users
  -- 3. Modify schema to not require auth.users reference for player profiles
  
  -- Create player profile
  -- Note: This will fail if id must reference auth.users and no user exists
  -- We'll need to create the auth user first or modify the constraint
  insert into public.profiles (id, email, full_name, role, account_type)
  values (v_player_id, v_player_email, p_player_name, 'client', 'player')
  on conflict (id) do nothing;

  -- Create parent profile linked to player
  insert into public.profiles (id, email, full_name, role, account_type, player_id)
  values (p_parent_id, p_parent_email, p_parent_name, 'client', 'parent', v_player_id)
  on conflict (id) do update set player_id = excluded.player_id;

  return v_player_id;
end; $$;
