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
  profiles: { full_name: string; email: string };
};

const supabase = getSupabaseBrowserClient();

async function fetchPending() {
  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,client_id,opening_id,openings(start_at,end_at),profiles:client_id(full_name,email)")
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
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Booking requests</h1>
        <p className="text-sm sm:text-base text-white/60">Confirm, decline, and keep your schedule aligned.</p>
      </header>

      {!data || data.length === 0 ? (
        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-16 lg:p-20 text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-white/40">All clear</p>
          <h2 className="text-2xl font-light text-white">No pending requests</h2>
          <p className="text-white/60 text-sm">Clients will appear here the moment they request time.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.map((booking) => {
            const startDate = new Date(booking.openings.start_at);
            const endDate = new Date(booking.openings.end_at);
            const isBusy = busy === booking.id;

            return (
              <div
                key={booking.id}
                className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl px-10 py-10 sm:px-12 sm:py-12"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Pending
                    </div>
                    <h3 className="text-2xl font-light text-white">{formatDate(startDate)}</h3>
                    <p className="text-sm text-white/70 flex flex-wrap gap-2 items-center">
                      <span>
                        {formatTime(startDate)} – {formatTime(endDate)}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="text-white/90 font-medium">
                        {booking.profiles?.full_name || booking.client_id.slice(0, 8)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      disabled={isBusy}
                      onClick={() => decide(booking.id, "decline")}
                      className="px-6 py-3 rounded-full border border-white/15 text-white/80 text-xs uppercase tracking-[0.3em] hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBusy ? "Processing..." : "Decline"}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => decide(booking.id, "accept")}
                      className="px-6 py-3 rounded-full bg-white text-black text-xs uppercase tracking-[0.3em] hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBusy ? "Processing..." : "Accept request"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CoachPageContainer>
  );
}
