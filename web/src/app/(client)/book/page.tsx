"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcRequestBooking } from '@/lib/rpc';
import { useState } from 'react';

type Opening = { id: string; start_at: string; end_at: string; spots_available: number };

const fetcher = async () => {
  const supabase = getSupabaseBrowserClient();
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28);
  const { data, error } = await supabase
    .from('openings')
    .select('id,start_at,end_at,spots_available')
    .gte('start_at', from.toISOString())
    .lte('end_at', to.toISOString())
    .gt('spots_available', 0)
    .order('start_at');
  if (error) throw error;
  return data as Opening[];
};

export default function BookPage() {
  const { data, error, isLoading, mutate } = useSWR('openings', fetcher);
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <div className="p-6">Loading openings...</div>;
  if (error) return <div className="p-6 text-red-600">{String(error.message || error)}</div>;

  async function request(id: string) {
    try {
      setBusy(id);
      await rpcRequestBooking(id, crypto.randomUUID());
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Available openings (next 4 weeks)</h1>
      <ul className="space-y-2">
        {data?.map(o => (
          <li key={o.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(o.start_at).toLocaleString()} → {new Date(o.end_at).toLocaleTimeString()}</div>
              <div className="text-sm text-gray-600">Spots: {o.spots_available}</div>
            </div>
            <button disabled={busy===o.id} onClick={() => request(o.id)} className="px-3 py-2 bg-black text-white rounded">
              {busy===o.id ? 'Requesting...' : 'Request'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}




