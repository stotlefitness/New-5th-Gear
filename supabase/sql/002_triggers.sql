-- 002_triggers.sql
-- Trigger functions and triggers to maintain invariants

create or replace function public._booking_accept_effects()
returns trigger language plpgsql as $$
declare
  v_coach_id uuid;
begin
  if NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    -- Get coach_id from opening
    select o.coach_id into v_coach_id from public.openings o where o.id = NEW.opening_id;
    
    -- Add client to coach roster if not already there
    insert into public.coach_clients (coach_id, client_id)
    values (v_coach_id, NEW.client_id)
    on conflict (coach_id, client_id) do nothing;
    
    -- Update opening spots
    update public.openings set spots_available = spots_available - 1
    where id = NEW.opening_id and spots_available > 0;
    if not found then raise exception 'no_spots'; end if;
    
    -- Create lesson
    insert into public.lessons (opening_id, coach_id, client_id, start_at, end_at)
    select o.id, o.coach_id, NEW.client_id, o.start_at, o.end_at from public.openings o
    where o.id = NEW.opening_id on conflict (opening_id) do nothing;
  end if;
  return NEW;
end; $$;

create or replace function public._booking_unaccept_effects()
returns trigger language plpgsql as $$
begin
  if OLD.status = 'accepted' and NEW.status <> 'accepted' then
    update public.openings set spots_available = spots_available + 1 where id = OLD.opening_id;
    delete from public.lessons l
    where l.opening_id = OLD.opening_id
      and not exists (select 1 from public.bookings b where b.opening_id = OLD.opening_id and b.status = 'accepted');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_booking_accept on public.bookings;
create trigger trg_booking_accept after insert or update of status on public.bookings
for each row execute function public._booking_accept_effects();

drop trigger if exists trg_booking_unaccept on public.bookings;
create trigger trg_booking_unaccept after update of status on public.bookings
for each row execute function public._booking_unaccept_effects();

-- Auto-create profile when user signs up
create or replace function public._handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
  v_role text;
begin
  -- Extract metadata with defaults
  v_full_name := coalesce(nullif(NEW.raw_user_meta_data->>'full_name', ''), 'User');
  v_role := coalesce(nullif(NEW.raw_user_meta_data->>'role', ''), 'client');
  
  -- Insert profile (trigger runs with SECURITY DEFINER, bypassing RLS)
  insert into public.profiles (id, email, full_name, role)
  values (NEW.id, NEW.email, v_full_name, v_role::user_role)
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name);
  
  return NEW;
exception
  when others then
    -- Log error but don't fail user creation
    raise warning 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    return NEW;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_user();




