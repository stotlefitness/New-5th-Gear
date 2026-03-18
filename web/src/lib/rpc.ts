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
  if (error) throw error;
}
