"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import Link from "next/link";
import { ClientPageWrapper } from "@/components/ClientPageWrapper";

const supabase = getSupabaseBrowserClient();

type Lesson = {
  id: string;
  start_at: string;
  end_at: string;
  location?: string | null;
};

type Booking = {
  id: string;
  status: string;
  opening_id: string;
  openings: {
    start_at: string;
    end_at: string;
  };
};

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
};

async function fetchClientDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Fetch upcoming lessons (this week)
  const { data: lessonsThisWeek } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, location")
    .eq("client_id", user.id)
    .gte("start_at", startOfWeek.toISOString())
    .lt("start_at", endOfWeek.toISOString())
    .order("start_at", { ascending: true });

  // Fetch next lesson
  const { data: nextLessonRaw } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, location")
    .eq("client_id", user.id)
    .gte("start_at", now.toISOString())
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fetch past lessons (last 3)
  const { data: pastLessonsRaw } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, location")
    .eq("client_id", user.id)
    .lt("start_at", now.toISOString())
    .order("start_at", { ascending: false })
    .limit(3);

  // Fetch pending requests
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id,status,opening_id,openings(start_at,end_at)")
    .eq("client_id", user.id)
    .in("status", ["pending", "accepted", "declined"])
    .order("created_at", { ascending: false })
    .limit(3);

  // Get conversation with coach
  const coachId = await (async () => {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "single_coach")
      .maybeSingle();
    return settings?.value?.coach_id || null;
  })();

  let latestMessage: Message | null = null;
  let unreadCount = 0;

  if (coachId) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", coachId)
      .eq("client_id", user.id)
      .maybeSingle();

    if (conversation) {
      // Get latest message
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1);

      latestMessage = messages && messages.length > 0 ? messages[0] : null;

      // Count unread
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", user.id)
        .is("read_at", null);
      unreadCount = count || 0;
    }
  }

  // Get player name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("account_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  const playerName = player?.name || profile?.full_name?.split(" ")[0] || "Player";

  // Transform data
  const lessonsWeek: Lesson[] = (lessonsThisWeek || []).map((l: any) => ({
    id: l.id,
    start_at: l.start_at,
    end_at: l.end_at,
    location: l.location || null,
  }));

  const nextLesson: Lesson | null = nextLessonRaw ? {
    id: nextLessonRaw.id,
    start_at: nextLessonRaw.start_at,
    end_at: nextLessonRaw.end_at,
    location: nextLessonRaw.location || null,
  } : null;

  const pastLessons: Lesson[] = (pastLessonsRaw || []).map((l: any) => ({
    id: l.id,
    start_at: l.start_at,
    end_at: l.end_at,
    location: l.location || null,
  }));

  const bookings: Booking[] = (bookingsRaw || []).map((booking: any) => {
    const opening = Array.isArray(booking.openings) ? booking.openings[0] : booking.openings;
    return {
      id: booking.id,
      status: booking.status,
      opening_id: booking.opening_id,
      openings: opening || { start_at: "", end_at: "" },
    };
  });

  const pendingRequests = bookings.filter((b) => b.status === "pending").length;

  return {
    playerName,
    lessonsThisWeek: lessonsWeek.length,
    nextLesson,
    pastLessons,
    pendingRequests,
    bookings,
    unreadMessages: unreadCount,
    latestMessage,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: "8px 16px",
        borderRadius: "999px",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
      }}
    >
      <span style={{ opacity: 0.7, marginRight: 6 }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function ClientDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR("client-dashboard", fetchClientDashboard);

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase
        .channel("client-dashboard-lessons")
        .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, () => mutate())
        .subscribe(),
      supabase
        .channel("client-dashboard-bookings")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => mutate())
        .subscribe(),
      supabase
        .channel("client-dashboard-messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => mutate())
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [mutate]);

  if (isLoading) {
    return (
      <ClientPageWrapper title="Dashboard" subtitle="Your training overview">
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading dashboard…</p>
        </div>
      </ClientPageWrapper>
    );
  }

  if (error || !data) {
    return (
      <ClientPageWrapper title="Dashboard" subtitle="Your training overview">
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              Error
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Unable to load dashboard
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>{String(error?.message || error)}</p>
          </div>
        </section>
      </ClientPageWrapper>
    );
  }

  const { playerName, lessonsThisWeek, nextLesson, pastLessons, pendingRequests, bookings, unreadMessages, latestMessage } = data;

  // Generate week days
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    return date;
  });

  return (
    <ClientPageWrapper title="Dashboard" subtitle="Your training schedule and updates">
      <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start" style={{ marginTop: 32 }}>
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Welcome Section */}
          <section className="auth-panel" style={{ width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white" style={{ marginBottom: 8 }}>
                  Welcome back, {playerName}
                </h1>
                <p className="text-sm sm:text-base text-white/60">
                  Here's your training schedule and updates for this week.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <StatPill label="Lessons this week" value={lessonsThisWeek} />
                <StatPill label="Pending requests" value={pendingRequests} />
                <StatPill label="Unread messages" value={unreadMessages} />
              </div>
            </div>
          </section>

          {/* This Week Schedule */}
          <section className="auth-panel" style={{ width: "100%" }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                  This week
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
                  Your upcoming sessions at a glance.
                </p>
              </div>

              {/* Week Strip */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        minWidth: "80px",
                        padding: "12px 8px",
                        borderRadius: "8px",
                        background: isToday ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.03)",
                        border: isToday ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}>
                        {formatDay(day)}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: isToday ? 600 : 400, color: "rgba(255, 255, 255, 0.9)" }}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next Session */}
              {nextLesson ? (
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: "12px",
                    background: "rgba(76, 175, 80, 0.1)",
                    border: "1px solid rgba(76, 175, 80, 0.3)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(76, 175, 80, 0.9)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    Next session
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                    {formatDate(new Date(nextLesson.start_at))}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: nextLesson.location ? 8 : 0 }}>
                    {formatTime(new Date(nextLesson.start_at))} – {formatTime(new Date(nextLesson.end_at))}
                  </div>
                  {nextLesson.location && (
                    <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      📍 {nextLesson.location}
                    </div>
                  )}
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 12,
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
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: 13, marginBottom: 16 }}>
                  No upcoming sessions scheduled.
                </div>
              )}

              <Link href="/book" className="field-link" style={{ textAlign: "center", padding: "10px 0" }}>
                View all sessions →
              </Link>
          </section>

          {/* Recent Lessons */}
          {pastLessons.length > 0 && (
            <section className="auth-panel" style={{ width: "100%" }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                  Recent lessons
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
                  Your completed training sessions.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {pastLessons.map((lesson) => {
                  const startDate = new Date(lesson.start_at);
                  return (
                    <Link
                      key={lesson.id}
                      href="/client/lessons"
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                          {formatDate(startDate)}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)" }}>
                          {formatTime(startDate)} – {formatTime(new Date(lesson.end_at))}
                          {lesson.location && ` • ${lesson.location}`}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Link href="/client/lessons" className="field-link" style={{ textAlign: "center", padding: "10px 0" }}>
                View full lesson history →
              </Link>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Messages */}
          <section className="auth-panel" style={{ width: "100%" }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                Messages
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
                Your conversation with Coach Alaina.
              </p>
            </div>

            {latestMessage ? (
              <>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginBottom: 8 }}>
                    {new Date(latestMessage.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.5 }}>
                    {latestMessage.content.substring(0, 100)}
                    {latestMessage.content.length > 100 ? "..." : ""}
                  </div>
                </div>
                {unreadMessages > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        fontSize: 11,
                        color: "rgba(239, 68, 68, 0.9)",
                      }}
                    >
                      {unreadMessages} unread message{unreadMessages !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <Link href="/client/messages" className="field-link" style={{ textAlign: "center", padding: "10px 0" }}>
                  Open Messages →
                </Link>
              </>
            ) : (
              <>
                <div style={{ padding: "20px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: 13, marginBottom: 16 }}>
                  No messages yet. Start a conversation with your coach!
                </div>
                <Link href="/client/messages" className="field-link" style={{ textAlign: "center", padding: "10px 0" }}>
                  Send a message →
                </Link>
              </>
            )}
          </section>

          {/* Requests */}
          {bookings.length > 0 && (
            <section className="auth-panel" style={{ width: "100%" }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                  Recent requests
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
                  Your lesson booking requests.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {bookings.map((booking) => {
                  const startDate = new Date(booking.openings.start_at);
                  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
                    pending: { bg: "rgba(255, 193, 7, 0.15)", border: "rgba(255, 193, 7, 0.3)", text: "rgba(255, 193, 7, 0.9)" },
                    accepted: { bg: "rgba(76, 175, 80, 0.15)", border: "rgba(76, 175, 80, 0.3)", text: "rgba(76, 175, 80, 0.9)" },
                    declined: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", text: "rgba(239, 68, 68, 0.9)" },
                  };
                  const colors = statusColors[booking.status] || statusColors.pending;

                  return (
                    <div
                      key={booking.id}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                        {formatDate(startDate)} • {formatTime(startDate)}
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          fontSize: 11,
                          color: colors.text,
                          textTransform: "uppercase",
                        }}
                      >
                        {booking.status}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link href="/client/requests" className="field-link" style={{ textAlign: "center", padding: "10px 0" }}>
                View all requests →
              </Link>
            </section>
          )}
        </div>
      </section>
    </ClientPageWrapper>
  );
}

