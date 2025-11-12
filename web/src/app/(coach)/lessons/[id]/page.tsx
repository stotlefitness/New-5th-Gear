"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState } from 'react';

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
  const id = params.id;
  const { data: lesson } = useSWR(['lesson', id], () => fetchLesson(id));
  const { data: notes, mutate } = useSWR(['notes', id], () => fetchNotes(id));
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  async function addNote() {
    setBusy(true);
    const { error } = await supabase.from('lesson_notes').insert({ lesson_id: id, content });
    setBusy(false);
    if (error) return alert(error.message);
    setContent('');
    mutate();
  }

  if (!lesson) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Lesson detail</h1>
      <div className="border rounded p-3">
        <div>{new Date(lesson.start_at).toLocaleString()} → {new Date(lesson.end_at).toLocaleTimeString()}</div>
        <div className="text-sm text-gray-600">Client: {lesson.client_id}</div>
      </div>
      <div className="border rounded p-3 space-y-2">
        <textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full border p-2 rounded" rows={4} placeholder="Add note..." />
        <button disabled={busy || !content.trim()} onClick={addNote} className="px-3 py-2 bg-black text-white rounded">Save note</button>
      </div>
      <div className="space-y-2">
        <h2 className="font-medium">Notes</h2>
        <ul className="space-y-1">
          {notes?.map(n => (
            <li key={n.id} className="border rounded p-2 text-sm">
              <div className="text-gray-600 text-xs">{new Date(n.created_at).toLocaleString()}</div>
              <div>{n.content}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}




