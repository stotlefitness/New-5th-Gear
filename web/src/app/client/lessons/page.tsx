"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientNavigation from "@/components/ClientNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

type Lesson = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
};

const supabase = getSupabaseBrowserClient();

async function fetchLessons(): Promise<{ upcoming: Lesson[]; past: Lesson[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { upcoming: [], past: [] };

  const now = new Date().toISOString();

  const { data: upcoming, error: upcomingError } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, created_at")
    .eq("client_id", user.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  if (upcomingError) throw upcomingError;

  const { data: past, error: pastError } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, created_at")
    .eq("client_id", user.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  if (pastError) throw pastError;

  return {
    upcoming: (upcoming || []) as Lesson[],
    past: (past || []) as Lesson[],
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ClientLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
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
              <h1 className="coach-header-title">{title}</h1>
              <p className="coach-header-subtitle">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ClientLessonsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const { data, error, isLoading } = useSWR("client-lessons", fetchLessons);

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
        router.push("/availability");
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
      <ClientLayout title="Your lessons" subtitle="See what's scheduled and review past sessions.">
        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout title="Your lessons" subtitle="See what's scheduled and review past sessions.">
        <section className="auth-panel" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              Error
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Unable to load lessons
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>{String(error.message || error)}</p>
          </div>
        </section>
      </ClientLayout>
    );
  }

  const { upcoming, past } = data || { upcoming: [], past: [] };

  return (
    <ClientLayout title="Your lessons" subtitle="See what's scheduled and review past sessions.">
      <div className="space-y-12">
        {/* Upcoming Lessons */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
              <div style={{ padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
                  No upcoming lessons yet.
                </p>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {upcoming.map((lesson) => {
                const startDate = new Date(lesson.start_at);
                const endDate = new Date(lesson.end_at);

                return (
                  <section key={lesson.id} className="auth-panel" style={{ width: "100%" }}>
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
                        <h3 style={{ fontSize: 20, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                          {formatDate(startDate)}
                        </h3>
                        <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
                          {formatTime(startDate)} – {formatTime(endDate)}
                        </p>
                      </div>
                      <div
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          background: "rgba(76, 175, 80, 0.15)",
                          border: "1px solid rgba(76, 175, 80, 0.3)",
                          fontSize: 11,
                          color: "rgba(76, 175, 80, 0.9)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Scheduled
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Lessons */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            History
          </h2>
          {past.length === 0 ? (
            <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
              <div style={{ padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
                  After your first session, we'll show your history here.
                </p>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {past.map((lesson) => {
                const startDate = new Date(lesson.start_at);
                const endDate = new Date(lesson.end_at);

                return (
                  <section key={lesson.id} className="auth-panel" style={{ width: "100%" }}>
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
                        <h3 style={{ fontSize: 20, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                          {formatDate(startDate)}
                        </h3>
                        <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
                          {formatTime(startDate)} – {formatTime(endDate)}
                        </p>
                      </div>
                      <div
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          background: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          fontSize: 11,
                          color: "rgba(255, 255, 255, 0.7)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Completed
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}

