"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcDecideBooking } from "@/lib/rpc";
import { useState } from "react";

type Booking = {
  id: string;
  status: string;
  client_id: string;
  opening_id: string;
  openings: { start_at: string; end_at: string };
};

const supabase = getSupabaseBrowserClient();

async function fetchPending() {
  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,client_id,opening_id,openings(start_at,end_at)")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw error;
  return data as Booking[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function RequestsPage() {
  const { data, mutate } = useSWR("coach_pending", fetchPending);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: "accept" | "decline") {
    try {
      setBusy(id);
      await rpcDecideBooking(id, decision);
      await mutate();
    } catch (e: any) {
      alert(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Booking requests</h1>
        <p className="coach-header-subtitle">
          Confirm, decline, and keep your schedule aligned.
        </p>
      </div>

      {!data || data.length === 0 ? (
        <section
          className="coach-card"
          style={{ maxWidth: 600, width: "100%", textAlign: "center" }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            All clear
          </div>
          <div style={{ fontSize: 18, marginBottom: 4 }}>No pending requests</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Athletes will appear here the moment they request time.
          </div>
        </section>
      ) : (
        <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
          {data.map((booking) => {
            const startDate = new Date(booking.openings.start_at);
            const endDate = new Date(booking.openings.end_at);
            const isBusy = busy === booking.id;

            return (
              <section
                key={booking.id}
                className="coach-card"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        opacity: 0.7,
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                      Pending
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 400, marginBottom: 6 }}>
                      {formatDate(startDate)}
                    </h3>
                    <div style={{ fontSize: 13, opacity: 0.7, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span>
                        {formatTime(startDate)} – {formatTime(endDate)}
                      </span>
                      <span style={{ opacity: 0.3 }}>•</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em", opacity: 0.6 }}>
                        {booking.client_id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      disabled={isBusy}
                      onClick={() => decide(booking.id, "decline")}
                      className="coach-btn-outline"
                      style={{ opacity: isBusy ? 0.6 : 1, cursor: isBusy ? "not-allowed" : "pointer" }}
                    >
                      {isBusy ? "Processing..." : "Decline"}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => decide(booking.id, "accept")}
                      className="coach-btn"
                      style={{ opacity: isBusy ? 0.6 : 1, cursor: isBusy ? "not-allowed" : "pointer" }}
                    >
                      {isBusy ? "Processing..." : "Accept request"}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
