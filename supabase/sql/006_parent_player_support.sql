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

-- Note: Parent account creation with player profile is handled via the API route
-- (/api/signup-parent) which uses Supabase Admin API to create auth users.
-- This ensures proper foreign key constraints are satisfied.
