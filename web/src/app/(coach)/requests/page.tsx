"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcDecideBooking } from "@/lib/rpc";
import { useState } from "react";
import CoachPageContainer from "@/components/CoachPageContainer";

type Booking = {
  id: string;
  status: string;
  client_id: string;
  opening_id: string;
  openings: { start_at: string; end_at: string };
  profiles: { full_name: string; email: string } | null;
};

type BookingRaw = {
  id: string;
  status: string;
  client_id: string;
  opening_id: string;
  openings: { start_at: string; end_at: string }[];
  profiles: { full_name: string; email: string }[] | { full_name: string; email: string } | null;
};

const supabase = getSupabaseBrowserClient();

async function fetchPending(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,client_id,opening_id,openings(start_at,end_at),profiles:client_id(full_name,email)")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw error;
  
  // Transform the data to match the Booking type
  return (data as BookingRaw[]).map((booking) => {
    // Handle openings array
    const opening = Array.isArray(booking.openings) 
      ? (booking.openings[0] || { start_at: "", end_at: "" })
      : booking.openings;
    
    // Handle profiles - Supabase returns it as an array for foreign key relationships
    let profile: { full_name: string; email: string } | null = null;
    if (booking.profiles) {
      if (Array.isArray(booking.profiles)) {
        profile = booking.profiles[0] || null;
      } else {
        profile = booking.profiles;
      }
    }
    
    return {
      id: booking.id,
      status: booking.status,
      client_id: booking.client_id,
      opening_id: booking.opening_id,
      openings: opening,
      profiles: profile,
    };
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function RequestsPage() {
  const { data, mutate, isLoading } = useSWR("coach_pending", fetchPending);
  const [busy, setBusy] = useState<string | null>(null);
  const [processedId, setProcessedId] = useState<string | null>(null);

  async function decide(id: string, decision: "accept" | "decline") {
    try {
      setBusy(id);
      await rpcDecideBooking(id, decision);
      setProcessedId(id);
      setTimeout(() => setProcessedId(null), 2000);
      await mutate();
    } catch (e: any) {
      alert(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Booking requests</h1>
        <p className="text-sm sm:text-base text-white/60">Confirm, decline, and keep your schedule aligned.</p>
      </header>

      {isLoading && (
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
          <div className="auth-form" style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                <div style={{ height: 20, background: "rgba(255, 255, 255, 0.1)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 16, background: "rgba(255, 255, 255, 0.05)", borderRadius: 4, width: "60%" }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!isLoading && data && data.length > 0 && (
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
          <div className="auth-form" style={{ gap: 12 }}>
            {data.map((booking) => {
              const startDate = new Date(booking.openings.start_at);
              const endDate = new Date(booking.openings.end_at);
              const isBusy = busy === booking.id;
              const isProcessed = processedId === booking.id;

              return (
                <div
                  key={booking.id}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                    opacity: isProcessed ? 0.5 : 1,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                        {booking.profiles?.full_name || "Client Request"}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
                        {booking.profiles?.email || booking.client_id.slice(0, 8)}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.7)" }}>
                      {formatDate(startDate)} · {formatTime(startDate)} – {formatTime(endDate)}
                    </div>

                    {!isProcessed && (
                      <div className="request-actions" style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button
                          disabled={isBusy}
                          onClick={() => decide(booking.id, "decline")}
                          className="field-link"
                          style={{
                            padding: "8px 16px",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            borderRadius: "999px",
                            color: "rgba(254, 226, 226, 0.9)",
                          }}
                        >
                          {isBusy ? "Processing..." : "Decline"}
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => decide(booking.id, "accept")}
                          className="btn-primary auth-submit"
                          style={{ marginTop: 0, padding: "8px 24px" }}
                        >
                          {isBusy ? "Processing..." : "Accept request"}
                        </button>
                      </div>
                    )}

                    {isProcessed && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: "rgba(34, 197, 94, 0.9)" }}>✓ Processed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              All clear
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              No pending requests
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
              Clients will appear here the moment they request time.
            </p>
          </div>
        </section>
      )}
    </CoachPageContainer>
  );
}
