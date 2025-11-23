"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcGenerateOpenings } from '@/lib/rpc';
import { useState } from 'react';
import Navigation from '@/components/Navigation';

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

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityPage() {
  const { data, mutate } = useSWR('availability_templates', fetchTemplates);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('15:00');
  const [end, setEnd] = useState('18:00');
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function addTemplate() {
    setBusy(true);
    setSuccess(null);
    const { error } = await supabase.from('availability_templates').insert({ weekday, start_time: start, end_time: end, slot_minutes: slotMinutes, active: true });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSuccess('Template added successfully!');
    setTimeout(() => setSuccess(null), 3000);
    mutate();
  }

  async function generate() {
    try {
      setBusy(true);
      setSuccess(null);
      const count = await rpcGenerateOpenings(6);
      setSuccess(`Generated ${count} openings for the next 6 weeks!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Navigation />

      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text font-[var(--font-space-grotesk)]">
              Manage Availability
            </h1>
            <p className="text-xl text-gray-400">Set your schedule and generate time slots for clients</p>
          </div>

          {success && (
            <div className="mb-6 card rounded-2xl p-4 border-green-500/20 bg-green-500/10 animate-slide-in">
              <div className="flex items-center gap-3 text-green-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">{success}</span>
              </div>
            </div>
          )}

          <div className="card rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>➕</span>
              Add New Template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Day of Week</label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  className="w-full input-modern px-4 py-3 rounded-xl text-white"
                >
                  {weekdays.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full input-modern px-4 py-3 rounded-xl text-white"
                  type="time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full input-modern px-4 py-3 rounded-xl text-white"
                  type="time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Slot Duration (min)</label>
                <input
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                  className="w-full input-modern px-4 py-3 rounded-xl text-white"
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
                className="flex-1 btn-primary py-4 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    Add Template
                  </>
                )}
              </button>
              <button
                disabled={busy}
                onClick={generate}
                className="flex-1 glass py-4 rounded-xl text-white font-semibold border border-white/10 hover:border-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Generate Next 6 Weeks
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📋</span>
              Existing Templates
            </h2>
            {data && data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((template) => (
                  <div
                    key={template.id}
                    className="glass rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">
                          {weekdays[template.weekday]}
                        </h3>
                        <p className="text-gray-400">
                          {template.start_time} - {template.end_time}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        template.active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {template.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-400">
                      <span>⏱️</span>
                      <span>{template.slot_minutes} minute slots</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-400">No templates yet. Add your first availability template above!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




