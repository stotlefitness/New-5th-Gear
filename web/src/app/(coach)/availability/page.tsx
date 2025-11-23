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

  async function addTemplate() {
    setBusy(true);
    const { error } = await supabase
      .from("availability_templates")
      .insert({ weekday, start_time: start, end_time: end, slot_minutes: slotMinutes, active: true });
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
        <p className="text-sm sm:text-base text-white/60">Set your weekly windows and generate bookable slots for your clients.</p>
      </header>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-16 lg:p-20" style={{ maxWidth: 860, width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 8,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Add new template
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <div className="coach-field-label">Day of week</div>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  className="coach-field-input"
                >
                  {weekdays.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="coach-field-label">Start time</div>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="coach-field-input"
                />
              </div>

              <div>
                <div className="coach-field-label">End time</div>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="coach-field-input"
                />
              </div>
            </div>

            <div style={{ maxWidth: 180 }}>
              <div className="coach-field-label">Slot duration (min)</div>
              <input
                type="number"
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                className="coach-field-input"
                min={30}
                step={15}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <button
              onClick={addTemplate}
              disabled={busy}
              className="coach-btn"
            >
              {busy ? "Adding..." : "Add template"}
            </button>
            <button
              onClick={generate}
              disabled={busy}
              className="coach-btn-outline"
            >
              Generate next 6 weeks
            </button>
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: "rgba(255, 255, 255, 0.1)",
            marginBottom: 12,
          }}
        />

        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 6,
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Existing templates
        </div>

        {!data || data.length === 0 ? (
          <div className="text-center py-10 text-white/60 text-sm">
            <p>No templates yet. Add your first window above.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {data.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-white/15 bg-white/5 px-8 py-6"
              >
                <div className="coach-list-row">
                  <div>
                    <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)" }}>
                      {weekdays[template.weekday]}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8, color: "rgba(255, 255, 255, 0.7)" }}>
                      {template.start_time} – {template.end_time}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: template.active
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(148, 163, 184, 0.15)",
                        border: template.active
                          ? "1px solid rgba(34,197,94,0.65)"
                          : "1px solid rgba(148, 163, 184, 0.3)",
                        color: template.active ? "rgb(187 247 208)" : "rgba(203, 213, 225, 0.8)",
                      }}
                    >
                      {template.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="coach-btn-outline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    opacity: 0.65,
                    marginTop: 4,
                    color: "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  {template.slot_minutes} minute slots
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </CoachPageContainer>
  );
}
