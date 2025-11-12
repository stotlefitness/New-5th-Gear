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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Manage Availability</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Set your weekly schedule templates and generate available time slots for clients to book.
          </p>
        </div>

        {/* Add Template Form */}
        <div className="card-premium mb-8">
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center space-x-2">
            <span>➕</span>
            <span>Add New Template</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Day of Week
              </label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(parseInt(e.target.value))}
                className="input-premium"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Start Time
              </label>
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="input-premium"
                type="time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                End Time
              </label>
              <input
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="input-premium"
                type="time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Slot Duration (min)
              </label>
              <input
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                className="input-premium"
                type="number"
                min={30}
                step={15}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              disabled={busy}
              onClick={addTemplate}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Adding...' : 'Add Template'}
            </button>
            <button
              disabled={busy}
              onClick={generate}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Generating...' : 'Generate Next 6 Weeks'}
            </button>
          </div>
        </div>

        {/* Existing Templates */}
        <div className="card-premium">
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center space-x-2">
            <span>📋</span>
            <span>Existing Templates</span>
          </h2>

          {!data || data.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-white/60">No templates yet. Add one above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-xl">
                        {['📅', '📅', '📅', '📅', '📅', '📅', '📅'][t.weekday]}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {WEEKDAYS[t.weekday]} • {t.start_time} - {t.end_time}
                      </div>
                      <div className="text-sm text-white/60">
                        {t.slot_minutes} minute slots
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium">
                    {t.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




