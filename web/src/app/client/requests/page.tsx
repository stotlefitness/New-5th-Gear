"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientNavigation from "@/components/ClientNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

type Booking = {
  id: string;
  status: string;
  created_at: string;
  openings: {
    start_at: string;
    end_at: string;
  };
};

const supabase = getSupabaseBrowserClient();

async function fetchRequests(): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, created_at, openings(start_at, end_at)")
    .eq("client_id", user.id)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  // Transform the data - Supabase returns openings as an array for foreign key relationships
  return (data || []).map((item: any) => {
    const opening = Array.isArray(item.openings) ? item.openings[0] : item.openings;
    return {
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      openings: opening || { start_at: "", end_at: "" },
    };
  }) as Booking[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ClientRequestsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const { data, error, isLoading, mutate } = useSWR("client-requests", fetchRequests);

  // Real-time subscription for booking status updates (when coach accepts/declines)
  useEffect(() => {
    if (!role || role !== "client") return;
    
    const supabaseClient = getSupabaseBrowserClient();
    let channel: any = null;
    
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      channel = supabaseClient
        .channel("client-bookings-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `client_id=eq.${user.id}`,
          },
          () => {
            mutate(); // Refresh when any booking for this client changes
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [mutate, role]);

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "client") {
        router.push("/dashboard");
        return;
      }

      setRole(profile.role);
      setChecking(false);
    }

    checkRole();
  }, [router]);

  if (checking || role !== "client") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
        </div>
        <ClientNavigation />
        <main className="relative z-10 flex items-center justify-center min-h-screen py-20">
          <div className="w-full max-w-4xl px-6 sm:px-8 lg:px-12">
            <div className="coach-page-inner">
              <div className="coach-header">
                <div className="coach-header-label">Client portal</div>
                <h1 className="coach-header-title">Lesson requests</h1>
                <p className="coach-header-subtitle">
                  Track pending requests and submit a new one if your schedule changes.
                </p>
              </div>
              <div className="flex items-center justify-center px-4 py-12">
                <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
        </div>
        <ClientNavigation />
        <main className="relative z-10 flex items-center justify-center min-h-screen py-20">
          <div className="w-full max-w-4xl px-6 sm:px-8 lg:px-12">
            <div className="coach-page-inner">
              <div className="coach-header">
                <div className="coach-header-label">Client portal</div>
                <h1 className="coach-header-title">Lesson requests</h1>
                <p className="coach-header-subtitle">
                  Track pending requests and submit a new one if your schedule changes.
                </p>
              </div>
              <section className="auth-panel" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
                <div style={{ padding: "40px 0" }}>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
                    Error
                  </p>
                  <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
                    Unable to load requests
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>{String(error.message || error)}</p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const requests = data || [];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
      </div>
      <ClientNavigation />
      <main className="relative z-10 flex items-center justify-center min-h-screen py-20">
        <div className="w-full max-w-4xl px-6 sm:px-8 lg:px-12">
          <div className="coach-page-inner">
            <div className="coach-header">
              <div className="coach-header-label">Client portal</div>
              <h1 className="coach-header-title">Lesson requests</h1>
              <p className="coach-header-subtitle">
                Track pending requests and submit a new one if your schedule changes.
              </p>
            </div>

            {requests.length === 0 ? (
              <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
                <div style={{ padding: "60px 40px" }}>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
                    All clear
                  </p>
                  <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
                    No pending requests
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)", marginBottom: 24 }}>
                    You're all set. Ready to book your next session?
                  </p>
                  <button
                    onClick={() => router.push("/book")}
                    className="btn-primary"
                    style={{ fontSize: 13, padding: "12px 24px" }}
                  >
                    New request
                  </button>
                </div>
              </section>
            ) : (
              <div className="space-y-6">
                {requests.map((request) => {
                  const startDate = new Date(request.openings.start_at);
                  const endDate = new Date(request.openings.end_at);

                  return (
                    <section key={request.id} className="auth-panel" style={{ width: "100%" }}>
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
                              {formatDate(startDate)}
                            </h2>
                            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 4 }}>
                              {formatTime(startDate)} – {formatTime(endDate)}
                            </p>
                            <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                              Status: {request.status}
                            </p>
                          </div>
                          <div
                            style={{
                              padding: "6px 12px",
                              borderRadius: "999px",
                              background: request.status === "pending" ? "rgba(255, 193, 7, 0.15)" : "rgba(255, 255, 255, 0.1)",
                              border: `1px solid ${request.status === "pending" ? "rgba(255, 193, 7, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                              fontSize: 11,
                              color: request.status === "pending" ? "rgba(255, 193, 7, 0.9)" : "rgba(255, 255, 255, 0.7)",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {request.status}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

