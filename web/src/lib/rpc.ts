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

/** @deprecated Use rpcGenerateSlotsForWindow per window instead */
export async function rpcGenerateOpenings(weeks: number) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('generate_openings', { p_weeks: weeks });
  if (error) throw error;
  return data as number;
}

export async function rpcGenerateSlotsForWindow(windowId: string, weeks = 6) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('generate_slots_for_window', {
    p_window_id: windowId,
    p_weeks: weeks,
  });
  if (error) throw error;
  return data as number;
}

export async function rpcSetSlotVisibility(openingId: string, visible: boolean) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('set_slot_visibility', {
    p_opening_id: openingId,
    p_visible: visible,
  });
  if (error) throw error;
}

export async function rpcDeleteWindow(windowId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('delete_window', { p_window_id: windowId });
  if (!error) return;

  // PostgREST returns 404 when the RPC doesn't exist OR isn't executable by the current role.
  // Make the failure actionable (usually means the SQL that defines/grants the RPC isn't applied in this Supabase project).
  const msg = (error as any)?.message ? String((error as any).message) : '';
  const code = (error as any)?.code ? String((error as any).code) : '';
  const looksLikeMissingRpc =
    msg.includes('404') ||
    msg.toLowerCase().includes('not found') ||
    code.toUpperCase().includes('404');

  if (looksLikeMissingRpc) {
    throw new Error(
      "Delete RPC not found (or not permitted). Apply the `public.delete_window(uuid)` function + `GRANT EXECUTE` in Supabase, then retry."
    );
  }

  throw error;
}
