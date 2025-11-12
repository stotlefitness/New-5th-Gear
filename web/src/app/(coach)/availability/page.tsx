"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcGenerateOpenings } from '@/lib/rpc';
import { useState } from 'react';

type Template = { id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number; active: boolean };

const supabase = getSupabaseBrowserClient();

async function fetchTemplates() {
  const { data, error } = await supabase
    .from('availability_templates')
    .select('*')
    .order('weekday');
  if (error) throw error;
  return data as Template[];
}

export default function AvailabilityPage() {
  const { data, mutate } = useSWR('availability_templates', fetchTemplates);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('15:00');
  const [end, setEnd] = useState('18:00');
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [busy, setBusy] = useState(false);

  async function addTemplate() {
    setBusy(true);
    const { error } = await supabase.from('availability_templates').insert({ weekday, start_time: start, end_time: end, slot_minutes: slotMinutes, active: true });
    setBusy(false);
    if (error) return alert(error.message);
    mutate();
  }

  async function generate() {
    try {
      setBusy(true);
      const count = await rpcGenerateOpenings(6);
      alert(`Generated ${count} openings`);
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Availability</h1>
      <div className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select value={weekday} onChange={e=>setWeekday(parseInt(e.target.value))} className="border p-2 rounded col-span-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <input value={start} onChange={e=>setStart(e.target.value)} className="border p-2 rounded" type="time" />
          <input value={end} onChange={e=>setEnd(e.target.value)} className="border p-2 rounded" type="time" />
          <input value={slotMinutes} onChange={e=>setSlotMinutes(parseInt(e.target.value))} className="border p-2 rounded" type="number" min={30} step={15} />
        </div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={addTemplate} className="px-3 py-2 bg-black text-white rounded">Add Template</button>
          <button disabled={busy} onClick={generate} className="px-3 py-2 border rounded">Generate next 6 weeks</button>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-medium">Existing templates</h2>
        <ul className="space-y-1">
          {data?.map(t => (
            <li key={t.id} className="border rounded p-2 text-sm flex justify-between">
              <span>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][t.weekday]} {t.start_time} - {t.end_time} ({t.slot_minutes}m)</span>
              <span>{t.active ? 'Active' : 'Inactive'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}




