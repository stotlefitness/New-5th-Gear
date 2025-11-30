"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientNavigation from "@/components/ClientNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcDecideBooking } from "@/lib/rpc";
import useSWR from "swr";

type Lesson = {
  id: string;
  opening_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  booking_id?: string;
  coach_id?: string;
};

const supabase = getSupabaseBrowserClient();

// Helper to get coach ID
async function getCoachId(): Promise<string | null> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "single_coach")
    .maybeSingle();

  if (settings?.value?.coach_id) {
    return settings.value.coach_id;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("coach_id")
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();

  return lesson?.coach_id || null;
}

// Helper to get or create conversation
async function getOrCreateConversation(coachId: string, clientId: string): Promise<string | null> {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ coach_id: coachId, client_id: clientId })
    .select("id")
    .single();

  if (error && error.code !== "23505") {
    console.error("Error creating conversation:", error);
    return null;
  }

  return newConv?.id || null;
}

async function fetchLessons(): Promise<{ upcoming: Lesson[]; past: Lesson[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { upcoming: [], past: [] };

  const now = new Date().toISOString();

  // Fetch upcoming lessons with booking info
  const { data: upcoming, error: upcomingError } = await supabase
    .from("lessons")
    .select("id, opening_id, start_at, end_at, created_at, coach_id")
    .eq("client_id", user.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  if (upcomingError) throw upcomingError;

  // Fetch bookings for upcoming lessons to get booking_id
  const upcomingWithBookings = await Promise.all(
    (upcoming || []).map(async (lesson) => {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("opening_id", lesson.opening_id)
        .eq("client_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      
      return {
        ...lesson,
        booking_id: booking?.id,
      } as Lesson;
    })
  );

  const { data: past, error: pastError } = await supabase
    .from("lessons")
    .select("id, opening_id, start_at, end_at, created_at, coach_id")
    .eq("client_id", user.id)
    .lt("start_at", now)
    .order("start_at", { ascending: false })
    .limit(20);

  if (pastError) throw pastError;

  return {
    upcoming: upcomingWithBookings,
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
  const { data, error, isLoading, mutate } = useSWR("client-lessons", fetchLessons);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    lesson: Lesson | null;
    action: "cancel" | "reschedule" | null;
  }>({ isOpen: false, lesson: null, action: null });
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

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

  // Real-time subscription for lessons (when booking is accepted, lesson appears immediately)
  useEffect(() => {
    if (!role || role !== "client") return;
    
    const supabaseClient = getSupabaseBrowserClient();
    
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      const channel = supabaseClient
        .channel("client-lessons-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "lessons",
            filter: `client_id=eq.${user.id}`,
          },
          () => {
            mutate(); // Refresh lessons when any change occurs
          }
        )
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    });
  }, [mutate, role]);

  async function handleCancelOrReschedule() {
    if (!modalState.lesson || !modalState.action || !modalState.lesson.booking_id) {
      alert("Missing lesson information");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Not authenticated");
        return;
      }

      const lesson = modalState.lesson;
      const coachId = lesson.coach_id || await getCoachId();
      if (!coachId) {
        alert("Coach not found");
        return;
      }

      // Cancel the booking
      await rpcDecideBooking(modalState.lesson.booking_id, "cancel");

      // Send message to coach
      const convId = await getOrCreateConversation(coachId, user.id);
      if (convId) {
        const actionText = modalState.action === "cancel" ? "cancel" : "reschedule";
        const dateStr = formatDate(new Date(lesson.start_at));
        const timeStr = `${formatTime(new Date(lesson.start_at))} – ${formatTime(new Date(lesson.end_at))}`;
        
        let messageContent = `I need to ${actionText} my lesson on ${dateStr} at ${timeStr}.`;
        if (message.trim()) {
          messageContent += `\n\n${message.trim()}`;
        }

        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: user.id,
          content: messageContent,
        });

        // Update conversation updated_at
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }

      // Close modal and refresh
      setModalState({ isOpen: false, lesson: null, action: null });
      setMessage("");
      await mutate();

      // For reschedule, redirect to book page
      if (modalState.action === "reschedule") {
        router.push("/book");
      }
    } catch (e: any) {
      alert(e.message || "Failed to process request");
    } finally {
      setProcessing(false);
    }
  }

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
    <>
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
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: 20, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                            {formatDate(startDate)}
                          </h3>
                          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
                            {formatTime(startDate)} – {formatTime(endDate)}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                          {lesson.booking_id && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => setModalState({ isOpen: true, lesson, action: "cancel" })}
                                style={{
                                  padding: "8px 16px",
                                  fontSize: 13,
                                  borderRadius: "6px",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "rgba(254, 226, 226, 0.9)",
                                  cursor: "pointer",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => setModalState({ isOpen: true, lesson, action: "reschedule" })}
                                style={{
                                  padding: "8px 16px",
                                  fontSize: 13,
                                  borderRadius: "6px",
                                  border: "1px solid rgba(255, 255, 255, 0.3)",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  color: "rgba(255, 255, 255, 0.9)",
                                  cursor: "pointer",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Reschedule
                              </button>
                            </div>
                          )}
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

      {/* Cancel/Reschedule Modal */}
      {modalState.isOpen && modalState.lesson && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => !processing && setModalState({ isOpen: false, lesson: null, action: null })}
        >
          <section
            className="auth-panel"
            style={{ maxWidth: 500, width: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 8 }}>
                {modalState.action === "cancel" ? "Cancel Lesson" : "Reschedule Lesson"}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)", marginBottom: 24 }}>
                {modalState.action === "cancel"
                  ? "This will cancel your lesson. Add a message to let your coach know why."
                  : "This will cancel your current lesson. Add a message and then you can book a new time."}
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                  Message to coach (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    modalState.action === "cancel"
                      ? "Let your coach know why you're canceling..."
                      : "Let your coach know when you'd like to reschedule..."
                  }
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setModalState({ isOpen: false, lesson: null, action: null });
                    setMessage("");
                  }}
                  disabled={processing}
                  style={{
                    padding: "10px 20px",
                    fontSize: 14,
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.7)",
                    cursor: processing ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelOrReschedule}
                  disabled={processing}
                  className="btn-primary"
                  style={{
                    padding: "10px 24px",
                    opacity: processing ? 0.6 : 1,
                    cursor: processing ? "not-allowed" : "pointer",
                  }}
                >
                  {processing ? "Processing..." : modalState.action === "cancel" ? "Cancel Lesson" : "Reschedule"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
