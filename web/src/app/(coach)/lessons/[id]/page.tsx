"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

const supabase = getSupabaseBrowserClient();

async function fetchLesson(id: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id,start_at,end_at,client_id')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as { id: string; start_at: string; end_at: string; client_id: string };
}

async function fetchNotes(id: string) {
  const { data, error } = await supabase
    .from('lesson_notes')
    .select('id,content,created_at')
    .eq('lesson_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as { id: string; content: string; created_at: string }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: lesson, isLoading: lessonLoading } = useSWR(['lesson', id], () => fetchLesson(id));
  const { data: notes, mutate } = useSWR(['notes', id], () => fetchNotes(id));
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setBusy(true);
    setSuccess(false);
    const { error } = await supabase.from('lesson_notes').insert({ lesson_id: id, content });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setContent('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    mutate();
  }

  if (lessonLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e]">
        <Navigation />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card rounded-2xl p-12 shimmer h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e]">
        <Navigation />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Lesson Not Found</h3>
              <p className="text-gray-400">The lesson you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startDate = new Date(lesson.start_at);
  const endDate = new Date(lesson.end_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Navigation />

      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="mb-8">
            <Link href="/requests" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Requests
            </Link>
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text font-[var(--font-space-grotesk)]">
              Lesson Details
            </h1>
          </div>

          <div className="card rounded-2xl p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
                ⚾
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Session Information</h2>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="font-medium">{formatDate(startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>{formatTime(startDate)} - {formatTime(endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👤</span>
                    <span>Client ID: {lesson.client_id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📝</span>
              Add Note
            </h2>
            {success && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 animate-slide-in">
                Note added successfully!
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full input-modern px-4 py-3 rounded-xl text-white placeholder-gray-500 mb-4 min-h-[120px] resize-none"
              rows={6}
              placeholder="Add your notes about this lesson session..."
            />
            <button
              disabled={busy || !content.trim()}
              onClick={addNote}
              className="btn-primary px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save Note
                </>
              )}
            </button>
          </div>

          <div className="card rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📚</span>
              Lesson Notes
            </h2>
            {notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => {
                  const noteDate = new Date(note.created_at);
                  return (
                    <div
                      key={note.id}
                      className="glass rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-sm text-purple-400 font-medium">
                          {noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {noteDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-400">No notes yet. Add your first note above!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




