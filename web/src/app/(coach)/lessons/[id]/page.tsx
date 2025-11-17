"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";
import CoachPageContainer from "@/components/CoachPageContainer";

const supabase = getSupabaseBrowserClient();

async function fetchLesson(id: string) {
  const { data, error } = await supabase.from("lessons").select("id,start_at,end_at,client_id").eq("id", id).single();
  if (error) throw error;
  return data as { id: string; start_at: string; end_at: string; client_id: string };
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
  const { data: lesson } = useSWR(["lesson", id], () => fetchLesson(id));
  const { data: notes, mutate } = useSWR(["notes", id], () => fetchNotes(id));
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("lesson_notes").insert({ lesson_id: id, content });
    setBusy(false);
    if (error) return alert(error.message);
    setContent("");
    mutate();
  }

  if (!lesson)
    return (
      <CoachPageContainer>
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading lesson details…</p>
        </div>
      </CoachPageContainer>
    );

  const startDate = new Date(lesson.start_at);
  const endDate = new Date(lesson.end_at);

  return (
    <CoachPageContainer>
      <header className="space-y-6 text-center">
        <Link href="/requests" className="text-xs uppercase tracking-[0.4em] text-white/40 hover:text-white/70 transition">
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

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 lg:p-16 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Client</p>
            <span className="font-mono text-lg tracking-[0.3em] text-white">{lesson.client_id.slice(0, 8)}</span>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Lesson id</p>
            <span className="text-white/70 text-sm">{lesson.id}</span>
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Notes</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none"
          placeholder="Add observations, training cues, or homework…"
        />
        <button
          disabled={busy || !content.trim()}
          onClick={addNote}
          className="px-6 py-3 rounded-full bg-white text-black text-xs uppercase tracking-[0.3em] hover:bg-white/90 transition disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save note"}
        </button>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 lg:p-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light text-white">Session timeline</h2>
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">{notes?.length ?? 0} entries</span>
        </div>
        {!notes || notes.length === 0 ? (
          <div className="text-center py-10 text-white/60 text-sm">No notes yet. Add your first insight above.</div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {new Date(note.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </CoachPageContainer>
  );
}
