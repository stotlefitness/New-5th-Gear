"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import Link from "next/link";
import CoachPageContainer from "@/components/CoachPageContainer";

const supabase = getSupabaseBrowserClient();

type Lesson = {
  id: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  client: {
    full_name: string;
    email: string;
  };
};

type Booking = {
  id: string;
  status: string;
  client_id: string;
  opening_id: string;
  openings: { start_at: string; end_at: string };
  profiles: { full_name: string; email: string } | null;
};

type Conversation = {
  id: string;
  client_id: string;
  updated_at: string;
  client: {
    full_name: string;
    email: string;
  };
};

async function fetchCoachDashboard() {
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
    .select("id, start_at, end_at, location, profiles:client_id(full_name, email)")
    .eq("coach_id", user.id)
    .gte("start_at", startOfWeek.toISOString())
    .lt("start_at", endOfWeek.toISOString())
    .order("start_at", { ascending: true });

  // Fetch all upcoming lessons (for next 3)
  const { data: allUpcoming } = await supabase
    .from("lessons")
    .select("id, start_at, end_at, location, profiles:client_id(full_name, email)")
    .eq("coach_id", user.id)
    .gte("start_at", now.toISOString())
    .order("start_at", { ascending: true })
    .limit(3);

  // Fetch openings this week
  const { data: openingsThisWeek } = await supabase
    .from("openings")
    .select("id, spots_available, capacity")
    .eq("coach_id", user.id)
    .gte("start_at", startOfWeek.toISOString())
    .lt("start_at", endOfWeek.toISOString());

  // Fetch pending requests
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id,status,client_id,opening_id,openings(start_at,end_at),profiles:client_id(full_name,email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(3);

  // Fetch recent conversations
  const { data: conversationsRaw } = await supabase
    .from("conversations")
    .select("id,client_id,updated_at,profiles:client_id(full_name,email)")
    .eq("coach_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(3);

  // Count unread messages
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", user.id);

  let unreadCount = 0;
  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map(c => c.id);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .is("read_at", null);
    unreadCount = count || 0;
  }

  // Transform lessons
  const transformLesson = (lesson: any): Lesson => {
    const profileData = Array.isArray(lesson.profiles) ? lesson.profiles[0] : lesson.profiles;
    return {
      id: lesson.id,
      start_at: lesson.start_at,
      end_at: lesson.end_at,
      location: lesson.location || null,
      client: profileData || { full_name: "Unknown Client", email: "" },
    };
  };

  const lessonsWeek = (lessonsThisWeek || []).map(transformLesson);
  const upcomingLessons = (allUpcoming || []).map(transformLesson);

  // Transform bookings
  const bookings: Booking[] = (bookingsRaw || []).map((booking: any) => {
    const opening = Array.isArray(booking.openings) ? booking.openings[0] : booking.openings;
    const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    return {
      id: booking.id,
      status: booking.status,
      client_id: booking.client_id,
      opening_id: booking.opening_id,
      openings: opening || { start_at: "", end_at: "" },
      profiles: profile || null,
    };
  });

  // Transform conversations
  const conversationsList: Conversation[] = (conversationsRaw || []).map((conv: any) => {
    const profile = Array.isArray(conv.profiles) ? conv.profiles[0] : conv.profiles;
    return {
      id: conv.id,
      client_id: conv.client_id,
      updated_at: conv.updated_at,
      client: profile || { full_name: "Unknown Client", email: "" },
    };
  });

  // Calculate stats
  const totalSlots = (openingsThisWeek || []).reduce((sum, o) => sum + o.capacity, 0);
  const bookedSlots = (openingsThisWeek || []).reduce((sum, o) => sum + (o.capacity - o.spots_available), 0);

  // Get coach name
  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = coachProfile?.full_name?.split(" ")[0] || "Coach";

  return {
    firstName,
    lessonsThisWeek: lessonsWeek.length,
    upcomingLessons,
    totalSlots,
    bookedSlots,
    pendingRequests: bookings.length,
    bookings,
    unreadMessages: unreadCount,
    conversations: conversationsList,
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

export default function CoachDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR("coach-dashboard", fetchCoachDashboard);

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase
        .channel("dashboard-lessons")
        .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, () => mutate())
        .subscribe(),
      supabase
        .channel("dashboard-bookings")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => mutate())
        .subscribe(),
      supabase
        .channel("dashboard-openings")
        .on("postgres_changes", { event: "*", schema: "public", table: "openings" }, () => mutate())
        .subscribe(),
      supabase
        .channel("dashboard-messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => mutate())
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [mutate]);

  if (isLoading) {
    return (
      <CoachPageContainer>
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading dashboard…</p>
        </div>
      </CoachPageContainer>
    );
  }

  if (error || !data) {
    return (
      <CoachPageContainer>
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
      </CoachPageContainer>
    );
  }

  const { firstName, lessonsThisWeek, upcomingLessons, totalSlots, bookedSlots, pendingRequests, bookings, unreadMessages, conversations } = data;

  // Generate week days
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    return date;
  });

  return (
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach dashboard</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Dashboard</h1>
        <p className="text-sm sm:text-base text-white/60">Your coaching schedule and updates</p>
      </header>

      {/* 2x2 Grid of equal square blocks */}
      <div className="grid grid-cols-2 w-full" style={{ gap: "32px" }}>
        {/* Block 1: Welcome */}
        <section className="auth-panel" style={{ width: "100%", minHeight: "450px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            <div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white" style={{ marginBottom: 8 }}>
                Welcome back, {firstName}
              </h1>
              <p className="text-sm sm:text-base text-white/60">
                Here's your coaching schedule and updates for this week.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <StatPill label="Lessons this week" value={lessonsThisWeek} />
              <StatPill label="Booked slots" value={`${bookedSlots} / ${totalSlots}`} />
              <StatPill label="Pending requests" value={pendingRequests} />
              <StatPill label="Unread messages" value={unreadMessages} />
            </div>
          </div>
        </section>

        {/* Block 2: Insights */}
        <section className="auth-panel" style={{ width: "100%", minHeight: "450px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
              Insights
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
              Your coaching overview.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}>
                Lessons this week
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255, 255, 255, 0.9)" }}>
                {lessonsThisWeek}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}>
                Booked capacity
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255, 255, 255, 0.9)" }}>
                {totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}>
                Pending requests
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255, 255, 255, 0.9)" }}>
                {pendingRequests}
              </div>
            </div>
          </div>
        </section>

        {/* Block 3: This Week Schedule */}
        <section className="auth-panel" style={{ width: "100%", minHeight: "450px", display: "flex", flexDirection: "column" }}>
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

            {/* Upcoming Lessons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {upcomingLessons.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.5)", textAlign: "center", padding: "20px 0" }}>
                  No upcoming lessons scheduled.
                </p>
              ) : (
                upcomingLessons.map((lesson) => {
                  const startDate = new Date(lesson.start_at);
                  const endDate = new Date(lesson.end_at);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/lessons/${lesson.id}`}
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
                          {formatTime(startDate)} – {formatTime(endDate)} • {lesson.client.full_name}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <Link href="/lessons" className="field-link" style={{ textAlign: "center", padding: "10px 0", marginTop: "auto" }}>
              View full lesson library →
            </Link>
        </section>

        {/* Block 4: Recent Messages */}
        <section className="auth-panel" style={{ width: "100%", minHeight: "450px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
              Recent messages
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>
              Latest conversations with clients.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, flex: 1 }}>
            {conversations.length === 0 ? (
              <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.5)", textAlign: "center", padding: "20px 0" }}>
                No messages yet.
              </p>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href="/messages"
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
                      {conv.client.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)" }}>
                      {new Date(conv.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link href="/messages" className="field-link" style={{ textAlign: "center", padding: "10px 0", marginTop: "auto" }}>
            Open Messages →
          </Link>
        </section>
      </div>
    </CoachPageContainer>
  );
}

