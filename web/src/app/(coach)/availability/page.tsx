"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcGenerateOpenings } from "@/lib/rpc";
import { useState } from "react";

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
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Availability Console</h1>
        <p className="coach-header-subtitle">
          Shape your week and generate the sessions athletes can book.
        </p>
      </div>

      <section className="coach-card" style={{ maxWidth: 720, width: "100%" }}>
        {/* TEMPLATES HEADER ROW */}
        <div className="coach-list-row">
          <span style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Templates
          </span>
          <button className="coach-btn-outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Close" : "Add template"}
          </button>
        </div>

        {showForm && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(51, 65, 85, 0.8)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
                  Day
                </label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 13,
                  }}
                >
                  {weekdays.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
                  Start
                </label>
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  type="time"
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
                  End
                </label>
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  type="time"
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
                  Slot
                </label>
                <select
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 13,
                  }}
                >
                  {[30, 45, 60, 75, 90, 120].map((value) => (
                    <option key={value} value={value}>
                      {value} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={busy}
                onClick={addTemplate}
                className="coach-btn"
                style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}
              >
                {busy ? "Adding..." : "Save template"}
              </button>
              <button
                disabled={busy}
                onClick={generate}
                className="coach-btn-outline"
                style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}
              >
                Generate next 6 weeks
              </button>
            </div>
          </div>
        )}

        {/* RECURRING WINDOWS */}
        <div className="coach-list-row">
          <span>Recurring windows</span>
        </div>

        {/* ACTIVE WINDOWS */}
        <div className="coach-list-row">
          <span>Active windows</span>
          <span style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.7 }}>
            {data?.length ?? 0} total
          </span>
        </div>

        {!data || data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(203, 213, 225, 0.6)", fontSize: 13 }}>
            No templates yet. Add your first window above.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {data.map((template) => (
              <div
                key={template.id}
                className="coach-card"
                style={{ marginTop: 12 }}
              >
                <div className="coach-list-row">
                  <span>
                    {weekdays[template.weekday]} • {template.start_time} – {template.end_time}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleTemplate(template.id, template.active)}
                      className={template.active ? "coach-btn" : "coach-btn-outline"}
                    >
                      {template.active ? "Active" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="coach-btn-outline"
                      style={{ borderColor: "rgba(239, 68, 68, 0.5)", color: "rgba(254, 226, 226, 0.9)" }}
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
                  }}
                >
                  {template.slot_minutes} minute slots
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
