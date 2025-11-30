import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function rpcRequestBooking(openingId: string, idempotencyKey?: string, locationRequested?: string | null) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('request_booking', {
    p_opening: openingId,
    p_idempotency_key: idempotencyKey ?? null,
    p_location_requested: locationRequested || null,
  });
  if (error) throw error;
  return data as string;
}

export async function rpcDecideBooking(bookingId: string, decision: 'accept' | 'decline' | 'cancel') {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('decide_booking', {
    p_booking: bookingId,
    p_decision: decision,
  });
  if (error) throw error;
}

export async function rpcGenerateOpenings(weeks: number) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('generate_openings', { p_weeks: weeks });
  if (error) throw error;
  return data as number;
}




