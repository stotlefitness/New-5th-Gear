"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcGenerateOpenings } from "@/lib/rpc";
import { useState } from "react";
import CoachPageContainer from "@/components/CoachPageContainer";

type Template = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
};

const supabase = getSupabaseBrowserClient();

async function fetchTemplates() {
  const { data, error } = await supabase.from("availability_templates").select("*").order("weekday");
  if (error) throw error;
  return data as Template[];
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const { data, mutate } = useSWR("availability_templates", fetchTemplates);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function addTemplate() {
    setBusy(true);
    const { error } = await supabase
      .from("availability_templates")
      .insert({ weekday, start_time: start, end_time: end, slot_minutes: slotMinutes, active: true });
    setBusy(false);
    if (error) return alert(error.message);
    mutate();
    setShowForm(false);
  }

  async function generate() {
    try {
      setBusy(true);
      const count = await rpcGenerateOpenings(6);
      alert(`Generated ${count} openings`);
    } catch (e: any) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTemplate(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("availability_templates")
      .update({ active: !currentActive })
      .eq("id", id);
    if (error) return alert(error.message);
    mutate();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const { error } = await supabase.from("availability_templates").delete().eq("id", id);
    if (error) return alert(error.message);
    mutate();
  }

  return (
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Availability Console</h1>
        <p className="text-sm sm:text-base text-white/60">Shape your week and generate the sessions athletes can book.</p>
      </header>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-16 lg:p-20 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Templates</p>
            <h2 className="text-2xl font-light text-white">Recurring windows</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-[0.3em] bg-white text-black hover:bg-white/90 transition-all"
          >
            {showForm ? "Close" : "Add template"}
          </button>
        </div>

        {showForm && (
          <div className="space-y-6 border-t border-white/10 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Day</label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:bg-white/10 focus:border-white/30 focus:outline-none"
                >
                  {weekdays.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Start</label>
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:bg-white/10 focus:border-white/30 focus:outline-none"
                  type="time"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">End</label>
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:bg-white/10 focus:border-white/30 focus:outline-none"
                  type="time"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Slot</label>
                <select
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:bg-white/10 focus:border-white/30 focus:outline-none"
                >
                  {[30, 45, 60, 75, 90, 120].map((value) => (
                    <option key={value} value={value}>
                      {value} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={busy}
                onClick={addTemplate}
                className="px-5 py-3 rounded-full bg-white text-black text-xs uppercase tracking-[0.3em] hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Adding..." : "Save template"}
              </button>
              <button
                disabled={busy}
                onClick={generate}
                className="px-5 py-3 rounded-full border border-white/20 text-white/80 text-xs uppercase tracking-[0.3em] hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate next 6 weeks
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-16 lg:p-20 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-2xl font-light text-white">Active windows</h2>
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">{data?.length ?? 0} total</span>
        </div>

        {!data || data.length === 0 ? (
          <div className="text-center py-10 text-white/60">
            <p className="text-sm">No templates yet. Add your first window above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.map((template) => (
              <div
                key={template.id}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-2xl border border-white/15 bg-white/5 px-8 py-6"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-2 h-2 rounded-full ${template.active ? "bg-white" : "bg-white/30"}`}
                  />
                  <div>
                    <p className="text-lg text-white font-light">
                      {weekdays[template.weekday]} • {template.start_time}–{template.end_time}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">{template.slot_minutes} minute slots</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTemplate(template.id, template.active)}
                    className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.3em] transition ${
                      template.active ? "bg-white text-black" : "border border-white/20 text-white/70"
                    }`}
                  >
                    {template.active ? "Active" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.3em] text-red-200 border border-red-300/30 hover:bg-red-500/10 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </CoachPageContainer>
  );
}
