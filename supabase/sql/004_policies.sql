-- 004_policies.sql
-- Enable and define strict RLS policies

alter table public.profiles enable row level security;
alter table public.coach_clients enable row level security;
alter table public.availability_templates enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.openings enable row level security;
alter table public.bookings enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_notes enable row level security;

-- profiles
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "insert self profile" on public.profiles;
drop policy if exists "update self profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert self profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update self profile" on public.profiles for update using (auth.uid() = id);

-- roster
drop policy if exists "coach manage roster" on public.coach_clients;
create policy "coach manage roster" on public.coach_clients for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- openings (public read-only)
drop policy if exists "read openings" on public.openings;
create policy "read openings" on public.openings for select using (true);
-- no write policy; mutations via SECURITY DEFINER funcs only

-- availability
drop policy if exists "coach manage availability" on public.availability_templates;
drop policy if exists "coach manage overrides" on public.availability_overrides;
create policy "coach manage availability" on public.availability_templates for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "coach manage overrides" on public.availability_overrides for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- bookings
drop policy if exists "client read own" on public.bookings;
drop policy if exists "coach read for own openings" on public.bookings;
create policy "client read own" on public.bookings for select using (client_id = auth.uid());
create policy "coach read for own openings" on public.bookings for select using (
  exists (select 1 from public.openings o where o.id = bookings.opening_id and o.coach_id = auth.uid())
);
-- no insert/update policies; use RPCs

-- lessons
drop policy if exists "client read own" on public.lessons;
drop policy if exists "coach read own" on public.lessons;
create policy "client read own" on public.lessons for select using (client_id = auth.uid());
create policy "coach read own" on public.lessons for select using (coach_id = auth.uid());

-- notes
drop policy if exists "coach manage notes" on public.lesson_notes;
create policy "coach manage notes" on public.lesson_notes for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());




