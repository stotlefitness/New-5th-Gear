-- 008_timezone_fix.sql
-- Fix timezone-naive slot generation: store coach's IANA timezone with each
-- availability window and use AT TIME ZONE when computing slot_start/slot_end
-- so that entered local times are interpreted correctly instead of as UTC.

-- ============================================================================
-- PART 1: Add timezone column to availability_windows
-- ============================================================================

alter table public.availability_windows
  add column if not exists timezone text not null default 'UTC';

-- ============================================================================
-- PART 2: Fix generate_slots_for_window to use AT TIME ZONE
-- ============================================================================
-- Previously: (date + start_time)::timestamptz  → cast interpreted naive time as UTC
-- Now:        (date + start_time)::timestamp AT TIME ZONE v_window.timezone
--             → PostgreSQL correctly converts the local wall-clock time to UTC

create or replace function public.generate_slots_for_window(
  p_window_id uuid,
  p_weeks     int default 6
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_coach      uuid := auth.uid();
  v_window     public.availability_windows%rowtype;
  v_step_mins  int;
  v_win_mins   float;
  v_max_slots  int;
  v_end_date   date := (current_date + (p_weeks || ' weeks')::interval)::date;
  v_count      int := 0;
begin
  if v_coach is null then raise exception 'unauthorized'; end if;

  -- Fetch and validate ownership
  select * into v_window
  from public.availability_windows
  where id = p_window_id and coach_id = v_coach;
  if not found then raise exception 'not_found'; end if;

  v_step_mins := v_window.slot_minutes + v_window.buffer_minutes;
  v_win_mins  := extract(epoch from (v_window.end_time - v_window.start_time)) / 60.0;
  -- Max number of slots that fit: slots where offset*step + slot_minutes <= window_duration
  v_max_slots := greatest(0, floor((v_win_mins - v_window.slot_minutes) / v_step_mins)::int + 1);

  if v_max_slots = 0 then return 0; end if;

  -- Remove future unbooked slots for this window (safe to regenerate)
  delete from public.openings
  where window_id = p_window_id
    and start_at >= now()
    and not exists (
      select 1 from public.bookings b
      where b.opening_id = openings.id
        and b.status in ('accepted', 'pending')
    );

  -- Generate slots with center-out release_order and initial visibility.
  -- AT TIME ZONE interprets the naive local timestamp in the coach's stored
  -- timezone, producing the correct UTC-aware timestamptz.
  insert into public.openings (
    coach_id, start_at, end_at, source, window_id,
    capacity, spots_available, location,
    is_visible, release_order
  )
  with base as (
    select
      d::date as slot_date,
      s       as slot_offset,
      (d::date + v_window.start_time + (s * v_step_mins || ' minutes')::interval)::timestamp
        AT TIME ZONE v_window.timezone as slot_start,
      (d::date + v_window.start_time + (s * v_step_mins + v_window.slot_minutes || ' minutes')::interval)::timestamp
        AT TIME ZONE v_window.timezone as slot_end
    from generate_series(current_date, v_end_date, '1 day'::interval) d,
         generate_series(0, v_max_slots - 1) s
    where
      (v_window.weekday is not null and extract(dow from d) = v_window.weekday)
      or
      (v_window.specific_date is not null and d::date = v_window.specific_date)
  ),
  counted as (
    select
      *,
      count(*) over (partition by slot_date) as n_slots
    from base
  ),
  ranked as (
    select
      *,
      (row_number() over (
        partition by slot_date
        order by
          abs(slot_offset::float - (n_slots - 1.0) / 2.0) asc,
          slot_offset desc
      ) - 1)::int as ro
    from counted
  )
  select
    v_coach,
    slot_start,
    slot_end,
    'template'::opening_source,
    p_window_id,
    1,
    1,
    v_window.location,
    ro < v_window.initial_visible_count,
    ro
  from ranked
  on conflict (coach_id, start_at, end_at) do nothing;

  get diagnostics v_count = row_count;

  -- Mark window as published after slot generation
  update public.availability_windows
  set status = 'published'
  where id = p_window_id;

  return v_count;
end; $$;
