-- 003_functions.sql
-- SECURITY DEFINER transactional RPCs

create or replace function public.request_booking(p_opening uuid, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_client uuid := auth.uid(); v_id uuid;
begin
  if v_client is null then raise exception 'unauthorized'; end if;
  perform 1 from public.openings o where o.id = p_opening and o.start_at > now() and o.spots_available > 0;
  if not found then raise exception 'not_available'; end if;
  insert into public.bookings(opening_id, client_id, idempotency_key)
  values (p_opening, v_client, p_idempotency_key)
  on conflict (opening_id, client_id) do update set id = bookings.id
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.decide_booking(p_booking uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_opening uuid; v_coach uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select b.opening_id, o.coach_id into v_opening, v_coach
  from public.bookings b join public.openings o on o.id = b.opening_id
  where b.id = p_booking;
  if v_opening is null then raise exception 'not_found'; end if;
  if v_coach <> v_uid then raise exception 'forbidden'; end if;
  if p_decision = 'accept' then
    update public.bookings set status = 'accepted' where id = p_booking;
  elsif p_decision = 'decline' then
    update public.bookings set status = 'declined' where id = p_booking;
  elsif p_decision = 'cancel' then
    update public.bookings set status = 'canceled' where id = p_booking;
  else
    raise exception 'bad_decision';
  end if;
end; $$;

create or replace function public.generate_openings(p_weeks int)
returns int language plpgsql security definer set search_path = public as $$
declare 
  v_coach uuid := auth.uid(); 
  v_count int := 0; 
  v_end date := (current_date + (p_weeks||' weeks')::interval)::date;
  v_start_date date := current_date;
begin
  if v_coach is null then raise exception 'unauthorized'; end if;
  perform 1 from public.app_settings s where s.key = 'single_coach' and (s.value->>'coach_id')::uuid = v_coach;
  if not found then raise exception 'forbidden'; end if;

  -- Delete existing template-generated slots for future dates (to avoid stale data)
  -- Only delete slots that aren't booked or are in the future
  delete from public.openings
  where coach_id = v_coach
    and source = 'template'
    and start_at >= v_start_date::timestamptz
    and not exists (
      select 1 from public.bookings b
      where b.opening_id = openings.id
      and b.status in ('accepted', 'pending')
    );

  -- Generate slots for each template
  -- For each day matching the weekday, create multiple slots based on time range
  -- Example: template 15:00-18:00 with 60-min slots creates 3 slots: 15:00, 16:00, 17:00
  insert into public.openings (coach_id, start_at, end_at, source, template_id, capacity, spots_available)
  select 
    v_coach,
    (d::date + t.start_time + (slot_offset * t.slot_minutes||' minutes')::interval)::timestamptz,
    (d::date + t.start_time + ((slot_offset + 1) * t.slot_minutes||' minutes')::interval)::timestamptz,
    'template'::opening_source,
    t.id,
    1, 
    1
  from public.availability_templates t,
       generate_series(v_start_date, v_end, '1 day') d,
       generate_series(0, 
         -- Calculate number of slots: floor((end_time - start_time) / slot_minutes) - 1
         -- For 15:00-18:00 (3 hours) with 60-min slots: floor(180/60) - 1 = 2, so slots 0,1,2 = 3 slots
         greatest(0, floor(extract(epoch from (t.end_time - t.start_time)) / 60 / t.slot_minutes)::int - 1)
       ) slot_offset
  where extract(dow from d) = t.weekday 
    and t.active = true
    and (t.start_time + (slot_offset * t.slot_minutes||' minutes')::interval) < t.end_time
    and not exists (
      select 1 from public.availability_overrides ov
      where ov.coach_id = v_coach and ov.date = d::date and ov.is_open = false
    )
  on conflict (coach_id, start_at, end_at) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Create or update profile (bypasses RLS)
create or replace function public.create_profile(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_role text default 'client',
  p_account_type text default 'player'
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> p_id then
    raise exception 'unauthorized';
  end if;
  
  insert into public.profiles (id, email, full_name, role, account_type)
  values (p_id, p_email, p_full_name, p_role::user_role, p_account_type::account_type)
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      account_type = excluded.account_type;
end; $$;

-- Create or update player (bypasses RLS)
create or replace function public.create_player(
  p_account_id uuid,
  p_name text,
  p_handedness text default null,
  p_height_inches int default null,
  p_weight_lbs int default null,
  p_age int default null,
  p_date_of_birth date default null,
  p_player_status text default 'new',
  p_is_primary boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_account_id then
    raise exception 'unauthorized';
  end if;
  
  -- If setting as primary, unset other primary players for this account
  if p_is_primary then
    update public.players set is_primary = false where account_id = p_account_id;
  end if;
  
  -- If this is the first player for the account, make it primary
  if not exists (select 1 from public.players where account_id = p_account_id) then
    p_is_primary := true;
  end if;
  
  insert into public.players (
    account_id, name, handedness, height_inches, weight_lbs, age, 
    date_of_birth, player_status, is_primary
  )
  values (
    p_account_id, p_name, 
    case when p_handedness is not null then p_handedness::handedness else null end,
    p_height_inches, p_weight_lbs, p_age, p_date_of_birth,
    p_player_status::player_status, p_is_primary
  )
  returning id into v_player_id;
  
  return v_player_id;
end; $$;

-- Check if email exists (for password reset validation)
create or replace function public.check_email_exists(p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from public.profiles where email = lower(trim(p_email))
  ) into v_exists;
  return v_exists;
end; $$;




