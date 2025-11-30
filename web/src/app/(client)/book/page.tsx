"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcRequestBooking } from "@/lib/rpc";
import { useState } from "react";

type Opening = {
  id: string;
  start_at: string;
  end_at: string;
  spots_available: number;
};

const fetcher = async () => {
  const supabase = getSupabaseBrowserClient();
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28);
  const { data, error } = await supabase
    .from("openings")
    .select("id,start_at,end_at,spots_available")
    .gte("start_at", from.toISOString())
    .lte("end_at", to.toISOString())
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

  async function request(id: string) {
    try {
      setBusy(id);
      await rpcRequestBooking(id, crypto.randomUUID());
      await mutate();
    } catch (e: any) {
      alert(e.message || "Request failed");
    } finally {
      setBusy(null);
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
                                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>until {formatTime(endDate)}</div>
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
    </div>
  );
}
