-- 001_schema.sql
-- Core enums, tables, indexes for 5th Gear Pitching (single coach)

-- enums
create type booking_status as enum ('pending','accepted','declined','canceled');
create type opening_source as enum ('template','override');
create type user_role as enum ('coach','client');

-- profiles mirror auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users not null,
  email text unique not null check (position('@' in email) > 1),
  full_name text not null,
  role user_role not null,
  time_zone text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);

-- roster (single coach)
create table if not exists public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id),
  check (coach_id <> client_id)
);
create index if not exists coach_clients_coach_idx on public.coach_clients(coach_id);
create index if not exists coach_clients_client_idx on public.coach_clients(client_id);

-- weekly availability templates
create table if not exists public.availability_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 60 check (slot_minutes in (30,45,60,75,90,120)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists availability_templates_coach_weekday_idx on public.availability_templates(coach_id, weekday);

-- date overrides (blackouts or ad-hoc opens)
create table if not exists public.availability_overrides (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  is_open boolean not null,
  start_time time,
  end_time time,
  slot_minutes int,
  note text,
  check ((is_open = false) or (is_open = true and start_time is not null and end_time is not null and end_time > start_time))
);
create index if not exists availability_overrides_coach_date_idx on public.availability_overrides(coach_id, date);

-- materialized openings (bookable slots)
create table if not exists public.openings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source opening_source not null,
  template_id uuid references public.availability_templates(id) on delete set null,
  override_id uuid references public.availability_overrides(id) on delete set null,
  capacity int not null default 1 check (capacity >= 1 and capacity <= 6),
  spots_available int not null default 1 check (spots_available >= 0 and spots_available <= capacity),
  created_at timestamptz not null default now(),
  unique (coach_id, start_at, end_at),
  check (end_at > start_at)
);
-- indexes for range queries
create index if not exists openings_start_idx on public.openings(start_at);
create index if not exists openings_coach_start_idx on public.openings(coach_id, start_at);
create index if not exists openings_spots_idx on public.openings(spots_available);

-- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references public.openings(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status booking_status not null default 'pending',
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (opening_id, client_id),
  unique nulls not distinct (client_id, idempotency_key)
);
create index if not exists bookings_opening_idx on public.bookings(opening_id);
create index if not exists bookings_client_idx on public.bookings(client_id);
create index if not exists bookings_status_idx on public.bookings(status);

-- lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid unique not null references public.openings(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists lessons_coach_start_idx on public.lessons(coach_id, start_at);
create index if not exists lessons_client_start_idx on public.lessons(client_id, start_at);

-- notes
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists lesson_notes_lesson_idx on public.lesson_notes(lesson_id);

-- single-coach config
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);
-- store {"coach_id":"<uuid>"} at key 'single_coach'


