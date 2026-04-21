-- 007_center_out.sql
-- Center-out progressive slot release system
-- Replaces template-based availability with availability windows + center-out publishing

-- ============================================================================
-- PART 1: Create availability_windows table
-- ============================================================================

create table if not exists public.availability_windows (
  id                    uuid primary key default gen_random_uuid(),
  coach_id              uuid not null references public.profiles(id) on delete cascade,
  -- exactly one of weekday or specific_date must be set
  weekday               int check (weekday between 0 and 6),           -- 0=Sun…6=Sat; null for one-off
  specific_date         date,                                          -- null for recurring
  location              text not null,
  start_time            time not null,
  end_time              time not null,
  slot_minutes          int not null default 45 check (slot_minutes > 0),
  buffer_minutes        int not null default 0 check (buffer_minutes >= 0),
  initial_visible_count int not null default 3 check (initial_visible_count >= 1),
  expansion_step        int not null default 1 check (expansion_step >= 1),
  status                text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at            timestamptz not null default now(),
  check (end_time > start_time),
  check (
    (weekday is not null and specific_date is null)
    or
    (weekday is null and specific_date is not null)
  )
);

create index if not exists availability_windows_coach_idx on public.availability_windows(coach_id);
create index if not exists availability_windows_coach_weekday_idx on public.availability_windows(coach_id, weekday);

-- ============================================================================
-- PART 2: Extend openings table with center-out columns
-- ============================================================================

-- Add window tracking and visibility columns
-- is_visible defaults to true so existing template-generated openings remain visible
alter table public.openings
  add column if not exists window_id     uuid references public.availability_windows(id) on delete set null,
  add column if not exists is_visible    boolean not null default true,
  add column if not exists release_order int;

create index if not exists openings_window_visible_idx on public.openings(window_id, is_visible) where window_id is not null;

-- ============================================================================
-- PART 3: generate_slots_for_window RPC
-- ============================================================================
-- Generates all valid slots for a window, assigns center-out release_order,
-- and marks the initial visible set (closest to center).
--
-- Algorithm:
--   For each matching date, generate slot indices 0..n-1.
--   Rank by distance from midpoint ascending; right-biased for ties (higher index wins).
--   release_order = rank (0-indexed, unique per slot per day).
--   is_visible = release_order < initial_visible_count.
--
-- This produces right-biased center-first ordering. For an 8-slot window:
--   midpoint=3.5 → ranked: 4,3,5,2,6,1,7,0 → release_order 0,1,2,3,4,5,6,7
--   initial 3 visible: indices 4(5:00), 3(4:15), 5(5:45)

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

  -- Generate slots with center-out release_order and initial visibility
  insert into public.openings (
    coach_id, start_at, end_at, source, window_id,
    capacity, spots_available, location,
    is_visible, release_order
  )
  with base as (
    -- Cross join dates × slot offsets, filtered to valid slots on matching days
    select
      d::date                                                                                  as slot_date,
      s                                                                                        as slot_offset,
      (d::date + v_window.start_time + (s * v_step_mins || ' minutes')::interval)::timestamptz as slot_start,
      (d::date + v_window.start_time + (s * v_step_mins + v_window.slot_minutes || ' minutes')::interval)::timestamptz as slot_end
    from generate_series(current_date, v_end_date, '1 day'::interval) d,
         generate_series(0, v_max_slots - 1) s
    where
      -- Recurring: match weekday
      (v_window.weekday is not null and extract(dow from d) = v_window.weekday)
      or
      -- One-off: match specific date
      (v_window.specific_date is not null and d::date = v_window.specific_date)
  ),
  counted as (
    -- Count total slots per day (for midpoint calculation)
    select
      *,
      count(*) over (partition by slot_date) as n_slots
    from base
  ),
  ranked as (
    -- Rank slots by distance from day's midpoint; right-biased tiebreak
    select
      *,
      (row_number() over (
        partition by slot_date
        order by
          abs(slot_offset::float - (n_slots - 1.0) / 2.0) asc,  -- closest to center first
          slot_offset desc                                         -- right-biased: higher index wins ties
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
    ro < v_window.initial_visible_count,  -- is_visible
    ro                                    -- release_order
  from ranked
  on conflict (coach_id, start_at, end_at) do nothing;

  get diagnostics v_count = row_count;

  -- Mark window as published after slot generation
  update public.availability_windows
  set status = 'published'
  where id = p_window_id;

  return v_count;
end; $$;

-- ============================================================================
-- PART 4: set_slot_visibility RPC (manual coach override)
-- ============================================================================

create or replace function public.set_slot_visibility(
  p_opening_id uuid,
  p_visible    boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid := auth.uid();
begin
  if v_coach is null then raise exception 'unauthorized'; end if;

  update public.openings
  set is_visible = p_visible
  where id = p_opening_id
    and coach_id = v_coach;

  if not found then raise exception 'not_found'; end if;
end; $$;

-- ============================================================================
-- PART 5: Update request_booking to enforce is_visible
-- ============================================================================

create or replace function public.request_booking(
  p_opening            uuid,
  p_idempotency_key    text default null,
  p_location_requested text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_client uuid := auth.uid();
  v_id     uuid;
begin
  if v_client is null then raise exception 'unauthorized'; end if;

  -- Only allow booking visible, future, available slots
  perform 1
  from public.openings o
  where o.id = p_opening
    and o.start_at > now()
    and o.spots_available > 0
    and o.is_visible = true;

  if not found then raise exception 'not_available'; end if;

  insert into public.bookings (opening_id, client_id, idempotency_key, location_requested)
  values (p_opening, v_client, p_idempotency_key, p_location_requested)
  on conflict (opening_id, client_id) do update
    set id = bookings.id,
        location_requested = coalesce(excluded.location_requested, bookings.location_requested)
  returning id into v_id;

  return v_id;
end; $$;

-- ============================================================================
-- PART 6: delete_window RPC
-- ============================================================================
-- Handles window deletion as security definer to safely cascade through
-- openings (which has RLS enabled with no direct UPDATE/DELETE policy).

create or replace function public.delete_window(p_window_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid := auth.uid();
begin
  if v_coach is null then raise exception 'unauthorized'; end if;

  -- Verify ownership
  perform 1 from public.availability_windows
  where id = p_window_id and coach_id = v_coach;
  if not found then raise exception 'not_found'; end if;

  -- Remove future unbooked openings for this window
  delete from public.openings
  where window_id = p_window_id
    and start_at >= now()
    and not exists (
      select 1 from public.bookings b
      where b.opening_id = openings.id
        and b.status in ('accepted', 'pending')
    );

  -- Delete the window itself
  delete from public.availability_windows
  where id = p_window_id and coach_id = v_coach;
end; $$;

-- Ensure PostgREST can execute this RPC (Supabase may hide it as 404 otherwise)
grant execute on function public.delete_window(uuid) to authenticated;

-- ============================================================================
-- PART 7: RLS for availability_windows
-- ============================================================================

alter table public.availability_windows enable row level security;

drop policy if exists "coach manage windows" on public.availability_windows;
create policy "coach manage windows" on public.availability_windows
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
