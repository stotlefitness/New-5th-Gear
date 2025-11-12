"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcDecideBooking } from '@/lib/rpc';
import { useState } from 'react';

type Booking = { id: string; status: string; client_id: string; opening_id: string; openings: { start_at: string; end_at: string } };

const supabase = getSupabaseBrowserClient();

async function fetchPending() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,status,client_id,opening_id,openings(start_at,end_at)')
    .eq('status','pending')
    .order('created_at');
  if (error) throw error;
  return data as Booking[];
}

export default function RequestsPage() {
  const { data, mutate } = useSWR('coach_pending', fetchPending);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: 'accept'|'decline') {
    try {
      setBusy(id);
      await rpcDecideBooking(id, decision);
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Booking requests</h1>
      <ul className="space-y-2">
        {data?.map(b => (
          <li key={b.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(b.openings.start_at).toLocaleString()} → {new Date(b.openings.end_at).toLocaleTimeString()}</div>
              <div className="text-sm text-gray-600">Client: {b.client_id}</div>
            </div>
            <div className="flex gap-2">
              <button disabled={busy===b.id} onClick={() => decide(b.id,'decline')} className="px-3 py-2 border rounded">Decline</button>
              <button disabled={busy===b.id} onClick={() => decide(b.id,'accept')} className="px-3 py-2 bg-black text-white rounded">Accept</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}




