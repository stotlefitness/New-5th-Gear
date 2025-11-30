"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcGenerateOpenings } from "@/lib/rpc";
import { useState, useEffect } from "react";

type Template = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
};

type Opening = {
  id: string;
  start_at: string;
  end_at: string;
  spots_available: number;
  capacity: number;
  source: string;
};

const supabase = getSupabaseBrowserClient();

async function fetchTemplates() {
  const { data, error } = await supabase.from("availability_templates").select("*").order("weekday");
  if (error) throw error;
  return data as Template[];
}

async function fetchOpenings(): Promise<Opening[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get start of current week (Monday) and end of next 4 weeks
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
  from.setHours(0, 0, 0, 0);
  
  const to = new Date(from);
  to.setDate(to.getDate() + 28); // 4 weeks from Monday

  const { data, error } = await supabase
    .from("openings")
    .select("id, start_at, end_at, spots_available, capacity, source")
    .eq("coach_id", user.id)
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at", { ascending: true });
  
  if (error) throw error;
  return (data || []) as Opening[];
}

function groupOpeningsByDate(openings: Opening[]): Map<string, Opening[]> {
  const grouped = new Map<string, Opening[]>();
  openings.forEach((opening) => {
    const date = new Date(opening.start_at);
    const dateKey = date.toDateString();
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(opening);
  });
  return grouped;
}

function formatDateForOpening(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTimeForOpening(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Convert 24-hour time string (HH:MM or HH:MM:SS) to 12-hour AM/PM format
function formatTime12Hour(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get date range for generation
function getDateRange(weeks: number): string {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (weeks * 7) - 1);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  
  return `${formatDate(today)} – ${formatDate(endDate)}`;
}

export default function AvailabilityPage() {
  const { data: templates, mutate: mutateTemplates } = useSWR("availability_templates", fetchTemplates);
  const { data: openings, mutate: mutateOpenings, isLoading: openingsLoading } = useSWR("coach_openings", fetchOpenings);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [busy, setBusy] = useState(false);

  // Real-time subscription for openings (refresh when new slots are generated)
  useEffect(() => {
    const channel = supabase
      .channel("coach-openings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openings",
        },
        () => {
          mutateOpenings(); // Refresh openings when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateOpenings]);

  async function addTemplate() {
    setBusy(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      setBusy(false);
      return alert("Not authenticated");
    }
    const { error } = await supabase
      .from("availability_templates")
      .insert({ coach_id: session.session.user.id, weekday, start_time: start, end_time: end, slot_minutes: slotMinutes, active: true });
    setBusy(false);
    if (error) return alert(error.message);
    mutateTemplates();
  }

  async function generate() {
    try {
      setBusy(true);
      const count = await rpcGenerateOpenings(6);
      await mutateOpenings(); // Refresh openings after generation
      alert(`Generated ${count} openings`);
    } catch (e: any) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const { error } = await supabase.from("availability_templates").delete().eq("id", id);
    if (error) return alert(error.message);
    mutateTemplates();
  }

  const groupedOpenings = openings ? groupOpeningsByDate(openings) : new Map();
  const openingDates = Array.from(groupedOpenings.keys()).sort();

  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Availability Console</h1>
        <p className="coach-header-subtitle">
          Set your weekly windows and generate bookable slots for your clients.
        </p>
      </div>

      <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
        <div
          className="availability-form-grid"
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
              className="availability-inputs-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <label className="field-label" htmlFor="weekday">
                  Day of week
                </label>
                <select
                  id="weekday"
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  className="field-input"
                >
                  {weekdays.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="start">
                  Start time
                </label>
                <input
                  id="start"
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="end">
                  End time
                </label>
                <input
                  id="end"
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div style={{ maxWidth: 180 }}>
              <label className="field-label" htmlFor="slotMinutes">
                Slot duration (min)
              </label>
              <input
                id="slotMinutes"
                type="number"
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
                className="field-input"
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
              className="btn-primary auth-submit"
            >
              {busy ? "Adding..." : "Add template"}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                onClick={generate}
                disabled={busy}
                className="field-link"
                style={{ textAlign: "center", padding: "11px 0" }}
              >
                Generate next 6 weeks
              </button>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.5)", textAlign: "center" }}>
                {getDateRange(6)}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: "rgba(148, 163, 184, 0.3)",
            marginBottom: 12,
            marginTop: 18,
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

        {!templates || templates.length === 0 ? (
          <div className="text-center py-10 text-white/60 text-sm">
            <p>No templates yet. Add your first window above.</p>
          </div>
        ) : (
          <div className="auth-form" style={{ gap: 8, marginTop: 8 }}>
            {templates.map((template: Template) => (
              <div
                key={template.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                <div
                  className="template-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)" }}>
                      {weekdays[template.weekday]}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8, color: "rgba(255, 255, 255, 0.7)" }}>
                      {formatTime12Hour(template.start_time)} – {formatTime12Hour(template.end_time)}
                    </div>
                  </div>

                  <div className="template-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      className="field-link"
                      style={{ padding: "4px 8px" }}
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

      {/* Published Openings Section */}
      <section className="auth-panel" style={{ maxWidth: 860, width: "100%", marginTop: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 16,
            color: "rgba(255, 255, 255, 0.9)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Published openings
        </div>
        <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)", marginBottom: 20 }}>
          See every open slot clients can book. This is exactly what clients see in their portal.
        </p>

        {openingsLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading openings...</p>
          </div>
        ) : openingDates.length === 0 ? (
          <div className="text-center py-12 text-white/60 text-sm">
            <p>No openings published yet.</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>Generate openings from templates above to create bookable slots.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {openingDates.map((dateKey) => {
              const dayOpenings = groupedOpenings.get(dateKey)!;
              const date = new Date(dateKey);
              const availableCount = dayOpenings.filter((o: Opening) => o.spots_available > 0).length;
              const totalCount = dayOpenings.length;

              return (
                <div
                  key={dateKey}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                        {formatDateForOpening(date)}
                      </h3>
                      <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {totalCount} {totalCount === 1 ? "slot" : "slots"} • {availableCount} available
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {dayOpenings.map((opening: Opening) => {
                      const startDate = new Date(opening.start_at);
                      const endDate = new Date(opening.end_at);
                      const isAvailable = opening.spots_available > 0;

                      return (
                        <div
                          key={opening.id}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "8px",
                            border: isAvailable 
                              ? "1px solid rgba(76, 175, 80, 0.3)" 
                              : "1px solid rgba(239, 68, 68, 0.3)",
                            background: isAvailable 
                              ? "rgba(76, 175, 80, 0.1)" 
                              : "rgba(239, 68, 68, 0.1)",
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                            {formatTimeForOpening(startDate)} – {formatTimeForOpening(endDate)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: isAvailable 
                                ? "rgba(76, 175, 80, 0.9)" 
                                : "rgba(239, 68, 68, 0.9)",
                            }}
                          >
                            {opening.spots_available > 0 
                              ? `${opening.spots_available} spot${opening.spots_available === 1 ? "" : "s"} available`
                              : "Booked"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
