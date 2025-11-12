"use client";
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState } from 'react';
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

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data: lesson } = useSWR(['lesson', id], () => fetchLesson(id));
  const { data: notes, mutate } = useSWR(['notes', id], () => fetchNotes(id));
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('lesson_notes').insert({ lesson_id: id, content });
    setBusy(false);
    if (error) return alert(error.message);
    setContent('');
    mutate();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/60">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  const startInfo = formatDate(lesson.start_at);
  const endInfo = formatDate(lesson.end_at);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/requests"
            className="inline-flex items-center space-x-2 text-white/60 hover:text-white transition-colors mb-6"
          >
            <span>←</span>
            <span>Back to Requests</span>
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Lesson Details</span>
          </h1>
        </div>

        {/* Lesson Info Card */}
        <div className="card-premium mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">📅</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{startInfo.date}</h2>
              <div className="space-y-2 text-white/70">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Time:</span>
                  <span>{startInfo.time} - {endInfo.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Client ID:</span>
                  <span className="font-mono text-sm">{lesson.client_id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Note Section */}
        <div className="card-premium mb-8">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center space-x-2">
            <span>✍️</span>
            <span>Add Note</span>
          </h2>
          <div className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-premium min-h-[120px] resize-none"
              placeholder="Add your notes about this lesson..."
              rows={5}
            />
            <button
              disabled={busy || !content.trim()}
              onClick={addNote}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Note'
              )}
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="card-premium">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center space-x-2">
            <span>📝</span>
            <span>Lesson Notes</span>
            {notes && notes.length > 0 && (
              <span className="ml-2 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium">
                {notes.length}
              </span>
            )}
          </h2>

          {!notes || notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-white/60">No notes yet. Add your first note above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const noteDate = new Date(note.created_at);
                return (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs text-white/50 font-medium">
                        {noteDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} at {noteDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




