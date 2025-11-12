-- 002_triggers.sql
-- Trigger functions and triggers to maintain invariants

create or replace function public._booking_accept_effects()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    update public.openings set spots_available = spots_available - 1
    where id = NEW.opening_id and spots_available > 0;
    if not found then raise exception 'no_spots'; end if;
    insert into public.lessons (opening_id, coach_id, client_id, start_at, end_at)
    select o.id, o.coach_id, NEW.client_id, o.start_at, o.end_at from public.openings o
    where o.id = NEW.opening_id on conflict (opening_id) do nothing;
  end if;
  return NEW;
end; $$;

create or replace function public._booking_unaccept_effects()
returns trigger language plpgsql as $$
begin
  if OLD.status = 'accepted' and NEW.status <> 'accepted' then
    update public.openings set spots_available = spots_available + 1 where id = OLD.opening_id;
    delete from public.lessons l
    where l.opening_id = OLD.opening_id
      and not exists (select 1 from public.bookings b where b.opening_id = OLD.opening_id and b.status = 'accepted');
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_booking_accept on public.bookings;
create trigger trg_booking_accept after insert or update of status on public.bookings
for each row execute function public._booking_accept_effects();

drop trigger if exists trg_booking_unaccept on public.bookings;
create trigger trg_booking_unaccept after update of status on public.bookings
for each row execute function public._booking_unaccept_effects();




