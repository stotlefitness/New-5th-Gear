-- 003_functions.sql
-- SECURITY DEFINER transactional RPCs

create or replace function public.request_booking(p_opening uuid, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_client uuid := auth.uid(); v_player_id uuid; v_id uuid;
begin
  if v_client is null then raise exception 'unauthorized'; end if;
  -- Get the effective player_id (player if account_type='player', player_id if account_type='parent')
  v_player_id := public.get_effective_player_id(v_client);
  if v_player_id is null then raise exception 'invalid_account'; end if;
  perform 1 from public.openings o where o.id = p_opening and o.start_at > now() and o.spots_available > 0;
  if not found then raise exception 'not_available'; end if;
  -- Bookings are always associated with the player, not the parent
  insert into public.bookings(opening_id, client_id, idempotency_key)
  values (p_opening, v_player_id, p_idempotency_key)
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
declare v_coach uuid := auth.uid(); v_count int := 0; v_end date := (current_date + (p_weeks||' weeks')::interval)::date;
begin
  if v_coach is null then raise exception 'unauthorized'; end if;
  perform 1 from public.app_settings s where s.key = 'single_coach' and (s.value->>'coach_id')::uuid = v_coach;
  if not found then raise exception 'forbidden'; end if;

  insert into public.openings (coach_id, start_at, end_at, source, template_id, capacity, spots_available)
  select v_coach,
         (d::date + t.start_time)::timestamptz,
         (d::date + t.start_time + (t.slot_minutes||' minutes')::interval)::timestamptz,
         'template'::opening_source,
         t.id,
         1, 1
  from public.availability_templates t,
       generate_series(current_date, v_end, '1 day') d
  where extract(dow from d) = t.weekday and t.active = true
    and not exists (
      select 1 from public.availability_overrides ov
      where ov.coach_id = v_coach and ov.date = d::date and ov.is_open = false
    )
  on conflict (coach_id, start_at, end_at) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end; $$;




