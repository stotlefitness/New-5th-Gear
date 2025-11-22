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
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "read player profile" on public.profiles;
drop policy if exists "insert self profile" on public.profiles;
drop policy if exists "update self profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
-- Parents can read their player's profile
create policy "read player profile" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'parent' and p.player_id = profiles.id)
);
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
drop policy if exists "parent read player bookings" on public.bookings;
drop policy if exists "coach read for own openings" on public.bookings;
-- Players can read their own bookings
create policy "client read own" on public.bookings for select using (client_id = auth.uid());
-- Parents can read bookings for their player
create policy "parent read player bookings" on public.bookings for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'parent' and p.player_id = bookings.client_id)
);
create policy "coach read for own openings" on public.bookings for select using (
  exists (select 1 from public.openings o where o.id = bookings.opening_id and o.coach_id = auth.uid())
);
-- no insert/update policies; use RPCs

-- lessons
drop policy if exists "client read own" on public.lessons;
drop policy if exists "parent read player lessons" on public.lessons;
drop policy if exists "coach read own" on public.lessons;
-- Players can read their own lessons
create policy "client read own" on public.lessons for select using (client_id = auth.uid());
-- Parents can read lessons for their player
create policy "parent read player lessons" on public.lessons for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'parent' and p.player_id = lessons.client_id)
);
create policy "coach read own" on public.lessons for select using (coach_id = auth.uid());

-- notes
drop policy if exists "coach manage notes" on public.lesson_notes;
create policy "coach manage notes" on public.lesson_notes for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- conversations
drop policy if exists "coach read conversations" on public.conversations;
drop policy if exists "client read conversations" on public.conversations;
drop policy if exists "parent read player conversations" on public.conversations;
drop policy if exists "coach create conversations" on public.conversations;
drop policy if exists "client create conversations" on public.conversations;
drop policy if exists "parent create player conversations" on public.conversations;
create policy "coach read conversations" on public.conversations for select using (coach_id = auth.uid());
-- Players can read their own conversations
create policy "client read conversations" on public.conversations for select using (client_id = auth.uid());
-- Parents can read conversations for their player
create policy "parent read player conversations" on public.conversations for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'parent' and p.player_id = conversations.client_id)
);
create policy "coach create conversations" on public.conversations for insert with check (coach_id = auth.uid());
-- Players can create their own conversations
create policy "client create conversations" on public.conversations for insert with check (client_id = auth.uid());
-- Parents can create conversations for their player
create policy "parent create player conversations" on public.conversations for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'parent' and p.player_id = conversations.client_id)
);

-- messages
drop policy if exists "read own messages" on public.messages;
drop policy if exists "send messages" on public.messages;
drop policy if exists "update read status" on public.messages;
-- Users can read messages in conversations they're part of (coach, player, or parent of player)
create policy "read own messages" on public.messages for select using (
  exists (
    select 1 from public.conversations c 
    where c.id = messages.conversation_id 
    and (
      c.coach_id = auth.uid() 
      or c.client_id = auth.uid()
      or exists (
        select 1 from public.profiles p 
        where p.id = auth.uid() 
        and p.account_type = 'parent' 
        and p.player_id = c.client_id
      )
    )
  )
);
-- Users can send messages if they're the sender and part of the conversation (coach, player, or parent of player)
create policy "send messages" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (
    select 1 from public.conversations c 
    where c.id = messages.conversation_id 
    and (
      c.coach_id = auth.uid() 
      or c.client_id = auth.uid()
      or exists (
        select 1 from public.profiles p 
        where p.id = auth.uid() 
        and p.account_type = 'parent' 
        and p.player_id = c.client_id
      )
    )
  )
);
create policy "update read status" on public.messages for update using (
  exists (
    select 1 from public.conversations c 
    where c.id = messages.conversation_id 
    and (
      c.coach_id = auth.uid() 
      or c.client_id = auth.uid()
      or exists (
        select 1 from public.profiles p 
        where p.id = auth.uid() 
        and p.account_type = 'parent' 
        and p.player_id = c.client_id
      )
    )
  )
);




