"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcGenerateSlotsForWindow, rpcSetSlotVisibility, rpcDeleteWindow } from "@/lib/rpc";
import { useState, useEffect, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AvailabilityWindow = {
  id: string;
  weekday: number | null;
  specific_date: string | null;
  location: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  buffer_minutes: number;
  initial_visible_count: number;
  expansion_step: number;
  timezone: string;
  status: "draft" | "published" | "archived";
  created_at: string;
};

type Opening = {
  id: string;
  start_at: string;
  end_at: string;
  spots_available: number;
  capacity: number;
  source: string;
  location: string | null;
  window_id: string | null;
  is_visible: boolean;
  release_order: number | null;
};

type PreviewSlot = {
  index: number;
  startMins: number;
  endMins: number;
  releaseOrder: number;
  isVisible: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const supabase = getSupabaseBrowserClient();

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SLOT_DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchWindows(): Promise<AvailabilityWindow[]> {
  const { data, error } = await supabase
    .from("availability_windows")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AvailabilityWindow[];
}

async function fetchOpenings(): Promise<Opening[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 42);

  const { data, error } = await supabase
    .from("openings")
    .select("id,start_at,end_at,spots_available,capacity,source,location,window_id,is_visible,release_order")
    .eq("coach_id", user.id)
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Opening[];
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function minsToTimeStr(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatTime12Hour(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatOpeningRange(start: Date, end: Date): string {
  const ds = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const ts = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const te = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sp = ts.split(" ")[1];
  const ep = te.split(" ")[1];
  return sp === ep
    ? `${ds} • ${ts}–${te.split(" ")[0]} ${sp}`
    : `${ds} • ${ts}–${te}`;
}

function groupByDate(openings: Opening[]): Map<string, Opening[]> {
  const map = new Map<string, Opening[]>();
  for (const o of openings) {
    const key = new Date(o.start_at).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return map;
}

/** Compute preview slots for the form inputs (client-side, no API call). */
function computePreview(
  startTime: string,
  endTime: string,
  slotMinutes: number,
  bufferMinutes: number,
  initialVisibleCount: number
): PreviewSlot[] {
  if (!startTime || !endTime) return [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const winMins = (eh * 60 + em) - (sh * 60 + sm);
  const stepMins = slotMinutes + bufferMinutes;
  if (winMins <= 0 || stepMins <= 0 || slotMinutes <= 0) return [];

  const slots: { index: number; startMins: number; endMins: number }[] = [];
  let idx = 0;
  while (idx * stepMins + slotMinutes <= winMins) {
    const startMins = sh * 60 + sm + idx * stepMins;
    slots.push({ index: idx, startMins, endMins: startMins + slotMinutes });
    idx++;
  }

  const n = slots.length;
  const midpoint = (n - 1) / 2.0;

  // Rank by distance from midpoint; right-biased (higher index first) for ties
  const ranked = [...slots].sort((a, b) => {
    const da = Math.abs(a.index - midpoint);
    const db = Math.abs(b.index - midpoint);
    if (Math.abs(da - db) > 1e-9) return da - db;
    return b.index - a.index;
  });

  const releaseOrderMap = new Map(ranked.map((s, rank) => [s.index, rank]));

  return slots.map((s) => {
    const ro = releaseOrderMap.get(s.index) ?? s.index;
    return { ...s, releaseOrder: ro, isVisible: ro < initialVisibleCount };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const { data: windows, mutate: mutateWindows } = useSWR("availability_windows", fetchWindows);
  const { data: openings, mutate: mutateOpenings, isLoading: openingsLoading } =
    useSWR("coach_openings", fetchOpenings);

  // Form state
  const [isOneOff, setIsOneOff] = useState(false);
  const [weekday, setWeekday] = useState(4); // Thursday
  const [specificDate, setSpecificDate] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState(45);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [initialVisibleCount, setInitialVisibleCount] = useState(3);
  const [busy, setBusy] = useState(false);

  // Generating slots per window
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateWeeks, setGenerateWeeks] = useState(6);

  // Visibility toggle in progress
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("coach-openings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "openings" }, () => {
        mutateOpenings();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mutateOpenings]);

  // Preview slots (computed from form inputs)
  const previewSlots = useMemo(
    () => computePreview(start, end, slotMinutes, bufferMinutes, initialVisibleCount),
    [start, end, slotMinutes, bufferMinutes, initialVisibleCount]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function addWindow() {
    if (!location.trim()) return alert("Location is required");
    if (isOneOff && !specificDate) return alert("Please choose a date");

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return alert("Not authenticated"); }

    const payload = {
      coach_id: user.id,
      weekday: isOneOff ? null : weekday,
      specific_date: isOneOff ? specificDate : null,
      location: location.trim(),
      start_time: start,
      end_time: end,
      slot_minutes: slotMinutes,
      buffer_minutes: bufferMinutes,
      initial_visible_count: initialVisibleCount,
      expansion_step: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: "draft",
    };

    const { error } = await supabase.from("availability_windows").insert(payload);
    setBusy(false);
    if (error) return alert(error.message);
    mutateWindows();
  }

  async function deleteWindow(id: string) {
    if (!confirm("Delete this availability window? All unbooked generated slots will be removed.")) return;
    try {
      await rpcDeleteWindow(id);
      await Promise.all([mutateWindows(), mutateOpenings()]);
    } catch (e: any) {
      alert(e.message || "Failed to delete window");
    }
  }

  async function generateSlots(windowId: string) {
    setGeneratingId(windowId);
    try {
      const count = await rpcGenerateSlotsForWindow(windowId, generateWeeks);
      await Promise.all([mutateWindows(), mutateOpenings()]);
      alert(`Generated ${count} slot${count === 1 ? "" : "s"}`);
    } catch (e: any) {
      alert(e.message || "Generation failed");
    } finally {
      setGeneratingId(null);
    }
  }

  async function toggleVisibility(opening: Opening) {
    setTogglingId(opening.id);
    try {
      await rpcSetSlotVisibility(opening.id, !opening.is_visible);
      await mutateOpenings();
    } catch (e: any) {
      alert(e.message || "Failed to update visibility");
    } finally {
      setTogglingId(null);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const groupedOpenings = openings ? groupByDate(openings) : new Map<string, Opening[]>();
  const openingDates = Array.from(groupedOpenings.keys()).sort();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Availability Console</h1>
        <p className="coach-header-subtitle">
          Define availability windows. The system seeds bookings near the center and expands outward as slots are booked.
        </p>
      </div>

      {/* ── Create Window Section ─────────────────────────────────────────── */}
      <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "rgba(255,255,255,0.9)" }}>
          Add availability window
        </div>

        {/* Recurring / One-off toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["Recurring", "One-off"] as const).map((label, i) => {
            const active = isOneOff === (i === 1);
            return (
              <button
                key={label}
                onClick={() => setIsOneOff(i === 1)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  border: active ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.15)",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Row 1: day/date + location */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isOneOff ? "220px 1fr" : "200px 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <label className="field-label">{isOneOff ? "Date" : "Day of week"}</label>
            {isOneOff ? (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="field-input"
              />
            ) : (
              <select
                value={weekday}
                onChange={(e) => setWeekday(parseInt(e.target.value))}
                className="field-input"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="field-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="field-input"
              placeholder="e.g., Flickinger Park, Fair Oaks"
            />
          </div>
        </div>

        {/* Row 2: start + end + slot duration + buffer */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <label className="field-label">Start time</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">End time</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Slot (min)</label>
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
              className="field-input"
            >
              {SLOT_DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Buffer (min)</label>
            <input
              type="number"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="field-input"
              min={0}
              step={5}
            />
          </div>
        </div>

        {/* Row 3: release settings + add button */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr auto",
            gap: 10,
            alignItems: "flex-end",
            marginBottom: 0,
          }}
        >
          <div>
            <label className="field-label">Initial visible slots</label>
            <input
              type="number"
              value={initialVisibleCount}
              onChange={(e) => setInitialVisibleCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="field-input"
              min={1}
              max={20}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="field-label">Release strategy</label>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                height: 38,
                display: "flex",
                alignItems: "center",
              }}
            >
              Center-out · expand 1 slot per booking
            </div>
          </div>
          <button
            onClick={addWindow}
            disabled={busy}
            className="btn-primary auth-submit"
            style={{ height: 38, whiteSpace: "nowrap" }}
          >
            {busy ? "Adding…" : "Add window"}
          </button>
        </div>

        {/* ── Slot Preview ──────────────────────────────────────────────── */}
        {previewSlots.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                height: 1,
                background: "rgba(148,163,184,0.2)",
                marginBottom: 14,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Slot preview
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                {previewSlots.length} total · {previewSlots.filter((s) => s.isVisible).length} initially visible
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {previewSlots.map((slot) => (
                <div
                  key={slot.index}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: slot.isVisible
                      ? "1px solid rgba(255,255,255,0.35)"
                      : "1px dashed rgba(255,255,255,0.15)",
                    background: slot.isVisible
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                    color: slot.isVisible
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.3)",
                    position: "relative",
                  }}
                  title={`Release order: ${slot.releaseOrder}${slot.isVisible ? " · Visible on publish" : " · Hidden initially"}`}
                >
                  {minsToTimeStr(slot.startMins)}
                  {slot.isVisible && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(5,8,22,0.8)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Filled slots are visible to clients. Dashed slots are hidden and unlock as bookings are accepted.
            </div>
          </div>
        )}

        {/* ── Existing Windows ──────────────────────────────────────────── */}
        <div style={{ height: 1, background: "rgba(148,163,184,0.2)", margin: "20px 0 14px" }} />
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Availability windows
        </div>

        {!windows || windows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            No windows yet. Add your first above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {windows.map((w) => (
              <WindowCard
                key={w.id}
                window={w}
                generateWeeks={generateWeeks}
                isGenerating={generatingId === w.id}
                onGenerate={() => generateSlots(w.id)}
                onDelete={() => deleteWindow(w.id)}
              />
            ))}
          </div>
        )}

        {/* Generate weeks control */}
        {windows && windows.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Generate</span>
            <input
              type="number"
              value={generateWeeks}
              onChange={(e) => setGenerateWeeks(Math.max(1, Math.min(26, parseInt(e.target.value) || 6)))}
              style={{
                width: 50,
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 12,
                textAlign: "center",
              }}
              min={1}
              max={26}
            />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>weeks ahead</span>
          </div>
        )}
      </section>

      {/* ── Published Openings Section ────────────────────────────────────── */}
      <section className="auth-panel" style={{ maxWidth: 860, width: "100%", marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Published openings
          </div>
          {openings && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {openings.filter((o) => o.is_visible).length} visible · {openings.filter((o) => !o.is_visible).length} hidden
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>
          All slots across all windows. Clients only see visible slots. Toggle visibility to override center-out logic.
        </p>

        {openingsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading…</p>
          </div>
        ) : openingDates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            <p>No openings yet.</p>
            <p style={{ marginTop: 6, fontSize: 12 }}>Add a window above and click Generate to create bookable slots.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {openingDates.map((dateKey) => {
              const dayOpenings = groupedOpenings.get(dateKey)!;
              const visible = dayOpenings.filter((o) => o.is_visible).length;
              const booked = dayOpenings.filter((o) => o.spots_available === 0).length;
              const date = new Date(dateKey);

              return (
                <div
                  key={dateKey}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                      {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </h3>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {visible} visible · {booked} booked · {dayOpenings.length} total
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {dayOpenings.map((opening) => {
                      const startDate = new Date(opening.start_at);
                      const endDate = new Date(opening.end_at);
                      const isBooked = opening.spots_available === 0;
                      const isToggling = togglingId === opening.id;

                      return (
                        <OpeningCard
                          key={opening.id}
                          opening={opening}
                          startDate={startDate}
                          endDate={endDate}
                          isBooked={isBooked}
                          isToggling={isToggling}
                          onToggleVisibility={() => toggleVisibility(opening)}
                        />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function WindowCard({
  window: w,
  generateWeeks,
  isGenerating,
  onGenerate,
  onDelete,
}: {
  window: AvailabilityWindow;
  generateWeeks: number;
  isGenerating: boolean;
  onGenerate: () => void;
  onDelete: () => void;
}) {
  const dayLabel = w.weekday !== null
    ? WEEKDAYS[w.weekday]
    : w.specific_date
    ? formatDateShort(w.specific_date)
    : "—";

  const statusColor =
    w.status === "published"
      ? { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.5)", text: "rgb(187,247,208)" }
      : w.status === "archived"
      ? { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)", text: "rgba(203,213,225,0.6)" }
      : { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.4)", text: "rgb(254,240,138)" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
            {dayLabel}
          </span>
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              padding: "2px 8px",
              borderRadius: 999,
              background: statusColor.bg,
              border: `1px solid ${statusColor.border}`,
              color: statusColor.text,
            }}
          >
            {w.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          {formatTime12Hour(w.start_time)} – {formatTime12Hour(w.end_time)} · {w.location}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
          {w.slot_minutes} min slots
          {w.buffer_minutes > 0 ? ` · ${w.buffer_minutes} min buffer` : ""}
          {" · "}initial {w.initial_visible_count} visible
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn-primary"
          style={{ fontSize: 11, padding: "6px 14px", opacity: isGenerating ? 0.6 : 1 }}
        >
          {isGenerating ? "Generating…" : `Generate ${generateWeeks}w`}
        </button>
        <button
          onClick={onDelete}
          className="field-link"
          style={{ fontSize: 11, padding: "6px 10px", color: "rgba(239,68,68,0.8)" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function OpeningCard({
  opening,
  startDate,
  endDate,
  isBooked,
  isToggling,
  onToggleVisibility,
}: {
  opening: Opening;
  startDate: Date;
  endDate: Date;
  isBooked: boolean;
  isToggling: boolean;
  onToggleVisibility: () => void;
}) {
  const { is_visible } = opening;

  let borderColor = "rgba(255,255,255,0.08)";
  let bgColor = "rgba(255,255,255,0.02)";

  if (isBooked) {
    borderColor = "rgba(239,68,68,0.25)";
    bgColor = "rgba(239,68,68,0.06)";
  } else if (is_visible) {
    borderColor = "rgba(76,175,80,0.25)";
    bgColor = "rgba(76,175,80,0.06)";
  }

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        opacity: is_visible ? 1 : 0.55,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>
        {startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        {" – "}
        {endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </div>

      {opening.location && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
          {opening.location}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: isBooked
              ? "rgba(239,68,68,0.8)"
              : is_visible
              ? "rgba(76,175,80,0.8)"
              : "rgba(255,255,255,0.3)",
          }}
        >
          {isBooked ? "Booked" : is_visible ? "Visible" : "Hidden"}
        </span>

        {!isBooked && (
          <button
            onClick={onToggleVisibility}
            disabled={isToggling}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: isToggling ? "default" : "pointer",
              opacity: isToggling ? 0.4 : 1,
            }}
          >
            {isToggling ? "…" : is_visible ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {opening.release_order !== null && (
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
          rank {opening.release_order}
        </div>
      )}
    </div>
  );
}
