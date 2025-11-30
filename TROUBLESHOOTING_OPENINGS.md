# Troubleshooting: Openings Not Showing in Client Portal

## Problem
Coach publishes lessons but they don't appear in the client portal.

## Root Cause Found
1. Only 1 future opening exists (Dec 1, 2025)
2. That opening has `spots_available = 0` (already booked)
3. Client query filters by `.gt("spots_available", 0)`, so returns empty array
4. Template is 15:00-20:00 (should create 5 slots) but only 1 was created

## Current State
- Today: November 30, 2025 (Sunday)
- Template: Monday, 15:00-20:00, 60-minute slots (should create 5 slots: 15:00, 16:00, 17:00, 18:00, 19:00)
- Existing openings: Only 1 slot on Dec 1, already booked
- RLS Policy: ✅ Correct (`using (true)` allows all to read)

## Solution

### Step 1: Coach should regenerate openings
1. Go to Coach Portal → Availability
2. Click "Generate next 6 weeks" 
3. This will:
   - Delete old unbooked template slots
   - Create multiple slots per day (the fixed function now creates all 5 slots)

### Step 2: Verify openings were created
Run in Supabase SQL:
```sql
SELECT 
  id,
  start_at,
  end_at,
  spots_available
FROM public.openings
WHERE start_at >= current_date::timestamptz
  AND spots_available > 0
ORDER BY start_at
LIMIT 20;
```

You should see multiple slots per Monday (5 slots: 3pm, 4pm, 5pm, 6pm, 7pm).

### Step 3: Check client portal
The client portal query filters by:
- `start_at >= today` (future dates only)
- `spots_available > 0` (only available slots)

After regeneration, slots should appear.

## Notes
- The generation function was already fixed to create multiple slots
- RLS policy is correct (no blocking)
- The issue is simply that old slots need to be regenerated

