-- 005_seed.sql
-- Seed single-coach setting after creating Alaina's profile.
-- Replace <COACH_UUID> with the coach's auth.user id.

-- example:
-- insert into public.profiles (id, email, full_name, role)
-- values ('<COACH_UUID>'::uuid, 'alaina@example.com', 'Alaina Valdez', 'coach');

-- configure single coach id
-- upsert to avoid duplicates
insert into public.app_settings(key, value)
values ('single_coach', jsonb_build_object('coach_id','<COACH_UUID>'))
on conflict (key) do update set value = excluded.value;




