"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcRequestBooking } from "@/lib/rpc";
import { useState, useEffect } from "react";

type Opening = {
  id: string;
  start_at: string;
  end_at: string;
  spots_available: number;
  location?: string | null;
};

const fetcher = async () => {
  const supabase = getSupabaseBrowserClient();
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28);
  const { data, error } = await supabase
    .from("openings")
    .select("id,start_at,end_at,spots_available,location")
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .gt("spots_available", 0)
    .order("start_at");
  if (error) throw error;
  return data as Opening[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

export default function BookPage() {
  const { data, error, isLoading, mutate } = useSWR("openings", fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState("");

  // Real-time subscription for openings (when coach publishes new slots)
  useEffect(() => {
    const supabaseClient = getSupabaseBrowserClient();
    
    const channel = supabaseClient
      .channel("openings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openings",
        },
        () => {
          mutate(); // Refresh openings when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [mutate]);

  async function request(id: string) {
    setRequestingId(id);
    setLocationRequested("");
  }

  async function confirmRequest() {
    if (!requestingId) return;
    try {
      setBusy(requestingId);
      await rpcRequestBooking(requestingId, crypto.randomUUID(), locationRequested.trim() || null);
      await mutate();
      setRequestingId(null);
      setLocationRequested("");
    } catch (e: any) {
      alert(e.message || "Request failed");
    } finally {
      setBusy(null);
      setRequestingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading available sessions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4">
        <section className="auth-panel" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              Error
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Unable to load sessions
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>{String(error.message || error)}</p>
          </div>
        </section>
      </div>
    );
  }

  const groupedOpenings = data ? groupOpeningsByDate(data) : new Map();
  const dates = Array.from(groupedOpenings.keys()).sort();

  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Client portal</div>
        <h1 className="coach-header-title">Available sessions</h1>
        <p className="coach-header-subtitle">
          Select an available time slot for your pitching session
        </p>
      </div>

      {dates.length === 0 ? (
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              No availability
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              No sessions available
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>Check back soon for new availability</p>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {dates.map((dateKey) => {
            const openings = groupedOpenings.get(dateKey)!;
            const date = new Date(dateKey);
            const isSelected = selectedDate === dateKey || dates.length === 1;

            return (
              <section key={dateKey} className="auth-panel" style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                        {formatDate(date)}
                      </h2>
                      <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {openings.length} {openings.length === 1 ? "session" : "sessions"} available
                      </p>
                    </div>
                    {dates.length > 1 && (
                      <button
                        onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                        className="field-link"
                        style={{ fontSize: 13, padding: "6px 12px" }}
                      >
                        {isSelected ? "Collapse" : "Expand"}
                      </button>
                    )}
                  </div>

                  {isSelected && (
                    <div
                      className="sessions-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {openings.map((opening: Opening) => {
                        const startDate = new Date(opening.start_at);
                        const endDate = new Date(opening.end_at);
                        const isBusy = busy === opening.id;

                        return (
                          <div
                            key={opening.id}
                            style={{
                              padding: "16px",
                              borderRadius: "12px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(255, 255, 255, 0.03)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                marginBottom: 12,
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                                  {formatTime(startDate)}
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginBottom: opening.location ? 4 : 0 }}>
                                  until {formatTime(endDate)}
                                </div>
                                {opening.location && (
                                  <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                    📍 {opening.location}
                                  </div>
                                )}
                              </div>
                              <div
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  fontSize: 11,
                                  color: "rgba(255, 255, 255, 0.7)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {opening.spots_available} {opening.spots_available === 1 ? "spot" : "spots"}
                              </div>
                            </div>

                            <button
                              disabled={isBusy}
                              onClick={() => request(opening.id)}
                              className="btn-primary"
                              style={{ width: "100%", fontSize: 13, padding: "10px 16px" }}
                            >
                              {isBusy ? "Requesting…" : "Request session"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Location Request Modal */}
      {requestingId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => {
            setRequestingId(null);
            setLocationRequested("");
            setBusy(null);
          }}
        >
          <div
            style={{
              background: "rgba(5, 8, 22, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 8 }}>
              Request Lesson
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)", marginBottom: 20 }}>
              Would you like to request a specific location for this lesson? (Optional)
            </p>
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="location-request"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Location Request
              </label>
              <input
                id="location-request"
                type="text"
                value={locationRequested}
                onChange={(e) => setLocationRequested(e.target.value)}
                placeholder="e.g., Main Field, Training Facility, etc."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: 14,
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmRequest();
                  } else if (e.key === "Escape") {
                    setRequestingId(null);
                    setLocationRequested("");
                    setBusy(null);
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setRequestingId(null);
                  setLocationRequested("");
                  setBusy(null);
                }}
                className="field-link"
                style={{ flex: 1, padding: "10px 16px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRequest}
                disabled={busy === requestingId}
                className="btn-primary"
                style={{ flex: 1, padding: "10px 16px", fontSize: 13 }}
              >
                {busy === requestingId ? "Requesting…" : "Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
