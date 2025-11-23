"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";
import CoachPageContainer from "@/components/CoachPageContainer";

const supabase = getSupabaseBrowserClient();

async function fetchLesson(id: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id,start_at,end_at,client_id,profiles:client_id(full_name,email)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as {
    id: string;
    start_at: string;
    end_at: string;
    client_id: string;
    profiles: { full_name: string; email: string } | null;
  };
}

async function fetchNotes(id: string) {
  const { data, error } = await supabase
    .from("lesson_notes")
    .select("id,content,created_at")
    .eq("lesson_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as { id: string; content: string; created_at: string }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: lesson, isLoading: lessonLoading } = useSWR(["lesson", id], () => fetchLesson(id));
  const { data: notes, mutate } = useSWR(["notes", id], () => fetchNotes(id));
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setBusy(true);
    setSuccess(false);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      setBusy(false);
      return alert("Not authenticated");
    }
    const { error } = await supabase
      .from("lesson_notes")
      .insert({ lesson_id: id, coach_id: session.session.user.id, content });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setContent("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    mutate();
  }

  if (lessonLoading) {
    return (
      <CoachPageContainer>
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading lesson details…</p>
        </div>
      </CoachPageContainer>
    );
  }

  if (!lesson) {
    return (
      <CoachPageContainer>
        <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
          <div style={{ padding: "40px 0" }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
              Not found
            </p>
            <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
              Lesson Not Found
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
              The lesson you're looking for doesn't exist.
            </p>
          </div>
        </section>
      </CoachPageContainer>
    );
  }

  const startDate = new Date(lesson.start_at);
  const endDate = new Date(lesson.end_at);

  return (
    <CoachPageContainer>
      <header className="text-center space-y-6 mb-8">
        <Link
          href="/requests"
          className="text-xs uppercase tracking-[0.4em] text-white/40 hover:text-white/70 transition inline-block mb-4"
        >
          ← Booking queue
        </Link>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Lesson details</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Session overview</h1>
          <p className="text-sm text-white/60">
            {formatDate(startDate)} · {formatTime(startDate)} – {formatTime(endDate)}
          </p>
        </div>
      </header>

      <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
        <div className="auth-form" style={{ gap: 16 }}>
          <div>
            <label className="field-label">Client</label>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 15, color: "rgba(255, 255, 255, 0.9)", marginBottom: 4 }}>
                {lesson.profiles?.full_name || lesson.client_id.slice(0, 8)}
              </div>
              {lesson.profiles?.email && (
                <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>{lesson.profiles.email}</div>
              )}
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(148, 163, 184, 0.2)",
              marginTop: 8,
              marginBottom: 8,
            }}
          />

          <div>
            <label className="field-label" htmlFor="note-content">
              Add note
            </label>
            {success && (
              <div className="auth-success" style={{ marginTop: 8, marginBottom: 8 }}>
                Note added successfully!
              </div>
            )}
            <textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="field-input"
              style={{
                minHeight: "120px",
                resize: "vertical",
                paddingTop: "8px",
                paddingBottom: "8px",
              }}
              placeholder="Add observations, training cues, or homework…"
              rows={5}
            />
            <button
              disabled={busy || !content.trim()}
              onClick={addNote}
              className="btn-primary auth-submit"
              style={{ marginTop: 12 }}
            >
              {busy ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      </section>

      <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Session timeline
        </div>

        {!notes || notes.length === 0 ? (
          <div className="text-center py-10 text-white/60 text-sm">
            No notes yet. Add your first insight above.
          </div>
        ) : (
          <div className="auth-form" style={{ gap: 12 }}>
            {notes.map((note) => {
              const noteDate = new Date(note.created_at);
              return (
                <div
                  key={note.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "rgba(255, 255, 255, 0.5)",
                      marginBottom: 8,
                    }}
                  >
                    {noteDate.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.8)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {note.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </CoachPageContainer>
  );
}
