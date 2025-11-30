"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import Link from "next/link";
import CoachPageContainer from "@/components/CoachPageContainer";

type Lesson = {
  id: string;
  opening_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  client_id: string;
  client: {
    full_name: string;
    email: string;
  };
};

const supabase = getSupabaseBrowserClient();

async function fetchLessons(): Promise<{ upcoming: Lesson[]; past: Lesson[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { upcoming: [], past: [] };

  const now = new Date().toISOString();

  // Fetch upcoming lessons
  const { data: upcomingRaw, error: upcomingError } = await supabase
    .from("lessons")
    .select("id, opening_id, start_at, end_at, created_at, client_id, profiles:client_id(full_name, email)")
    .eq("coach_id", user.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  if (upcomingError) throw upcomingError;

  // Fetch past lessons
  const { data: pastRaw, error: pastError } = await supabase
    .from("lessons")
    .select("id, opening_id, start_at, end_at, created_at, client_id, profiles:client_id(full_name, email)")
    .eq("coach_id", user.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(50);

  if (pastError) throw pastError;

  // Transform data to handle Supabase foreign key relationships
  const transformLesson = (lesson: any): Lesson => {
    const profileData = Array.isArray(lesson.profiles) ? lesson.profiles[0] : lesson.profiles;
    return {
      id: lesson.id,
      opening_id: lesson.opening_id,
      start_at: lesson.start_at,
      end_at: lesson.end_at,
      created_at: lesson.created_at,
      client_id: lesson.client_id,
      client: profileData || { full_name: "Unknown Client", email: "" },
    };
  };

  return {
    upcoming: (upcomingRaw || []).map(transformLesson),
    past: (pastRaw || []).map(transformLesson),
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function LessonsPage() {
  const { data, error, isLoading, mutate } = useSWR("coach-lessons", fetchLessons);

  // Real-time subscription for lessons
  useEffect(() => {
    const channel = supabase
      .channel("coach-lessons-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lessons",
        },
        () => {
          mutate(); // Refresh lessons when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  if (isLoading) {
    return (
      <CoachPageContainer>
        <header className="text-center space-y-8 mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Lesson library</h1>
          <p className="text-sm sm:text-base text-white/60">Review past sessions, jump into detailed notes, and keep clients aligned.</p>
        </header>
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </CoachPageContainer>
    );
  }

  if (error) {
    return (
      <CoachPageContainer>
        <header className="text-center space-y-8 mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Lesson library</h1>
          <p className="text-sm sm:text-base text-white/60">Review past sessions, jump into detailed notes, and keep clients aligned.</p>
        </header>
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
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
      </CoachPageContainer>
    );
  }

  const { upcoming, past } = data || { upcoming: [], past: [] };

  return (
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Lesson library</h1>
        <p className="text-sm sm:text-base text-white/60">Review past sessions, jump into detailed notes, and keep clients aligned.</p>
      </header>

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
                  No upcoming lessons scheduled.
                </p>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {upcoming.map((lesson) => {
                const startDate = new Date(lesson.start_at);
                const endDate = new Date(lesson.end_at);

                return (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="block"
                  >
                    <section className="auth-panel" style={{ width: "100%", cursor: "pointer", transition: "all 0.2s" }}>
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
                          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 4 }}>
                            {formatTime(startDate)} – {formatTime(endDate)}
                          </p>
                          <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.5)" }}>
                            {lesson.client.full_name} {lesson.client.email && `• ${lesson.client.email}`}
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
                          Confirmed
                        </div>
                      </div>
                    </section>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Lessons */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Completed
          </h2>
          {past.length === 0 ? (
            <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
              <div style={{ padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
                  No completed lessons yet.
                </p>
              </div>
            </section>
          ) : (
            <div className="space-y-6">
              {past.map((lesson) => {
                const startDate = new Date(lesson.start_at);
                const endDate = new Date(lesson.end_at);

                return (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="block"
                  >
                    <section className="auth-panel" style={{ width: "100%", cursor: "pointer", transition: "all 0.2s" }}>
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
                          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 4 }}>
                            {formatTime(startDate)} – {formatTime(endDate)}
                          </p>
                          <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.5)" }}>
                            {lesson.client.full_name} {lesson.client.email && `• ${lesson.client.email}`}
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
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CoachPageContainer>
  );
}
