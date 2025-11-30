-- 005_rls_fixes.sql
-- Fix RLS issues identified by Supabase linter
-- This migration addresses security vulnerabilities by ensuring all tables have proper RLS

-- ============================================================================
-- PART 1: Enable RLS on 5th Gear tables that are missing it
-- ============================================================================

-- Players table - should have RLS but currently disabled
alter table public.players enable row level security;

-- ============================================================================
-- PART 2: Lock down app_settings (internal config, should not be public)
-- ============================================================================

-- Enable RLS on app_settings
alter table public.app_settings enable row level security;

-- Revoke all privileges from anon and authenticated roles
revoke all on table public.app_settings from anon, authenticated;

-- Create a strict policy that only allows service role access
-- (This effectively blocks all client access since service role is server-only)
create policy "service role only" on public.app_settings
  for all
  using (
    current_setting('request.jwt.claims', true)::jsonb ? 'role'
    and (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- ============================================================================
-- PART 3: Handle legacy/unused tables from other projects
-- ============================================================================

-- These tables appear to be from a salon booking system and are not used by 5th Gear
-- Option 1: Drop them (safest, cleanest)
-- Option 2: Revoke privileges (if you want to keep them for reference)

-- Drop legacy tables (they're not referenced by 5th Gear tables)
-- Drop in order to respect foreign key dependencies
-- Using CASCADE to automatically drop dependent constraints
drop table if exists public.availability_slots cascade;
drop table if exists public.staff cascade;
drop table if exists public.customers cascade;
drop table if exists public.services cascade;
drop table if exists public.locations cascade;
drop table if exists public.salons cascade;

-- ============================================================================
-- PART 4: Verify and fix RLS policies for 5th Gear tables
-- ============================================================================

-- Ensure all 5th Gear tables have RLS enabled (idempotent, safe to run multiple times)
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.coach_clients enable row level security;
alter table public.availability_templates enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.openings enable row level security;
alter table public.bookings enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.app_settings enable row level security;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. If dropping legacy tables fails due to foreign keys, run this first:
--    - Check what's referencing them: SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
--    - Drop foreign keys first, then tables
--
-- 2. After running this migration, the Supabase linter should show:
--    - ✅ All 5th Gear tables have RLS enabled
--    - ✅ app_settings is locked down
--    - ✅ Legacy tables are removed (or locked down if you choose Option 2)
--
-- 3. To verify RLS is working:
--    - Try querying as anon user: should be blocked for app_settings
--    - Try querying as authenticated user: should only see their own data per policies

