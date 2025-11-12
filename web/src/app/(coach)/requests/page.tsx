"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcDecideBooking } from '@/lib/rpc';
import { useState } from 'react';

type Booking = { id: string; status: string; client_id: string; opening_id: string; openings: { start_at: string; end_at: string } };

const supabase = getSupabaseBrowserClient();

async function fetchPending() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,status,client_id,opening_id,openings(start_at,end_at)')
    .eq('status','pending')
    .order('created_at');
  if (error) throw error;
  return data as Booking[];
}

export default function RequestsPage() {
  const { data, mutate } = useSWR('coach_pending', fetchPending);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: 'accept'|'decline') {
    try {
      setBusy(id);
      await rpcDecideBooking(id, decision);
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      fullDate: date,
    };
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Booking Requests</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Review and manage lesson booking requests from your clients.
          </p>
        </div>

        {!data || data.length === 0 ? (
          <div className="card-premium text-center py-16">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold mb-2 text-white">All Caught Up!</h2>
            <p className="text-white/60">No pending booking requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((b) => {
              const startInfo = formatDate(b.openings.start_at);
              const endInfo = formatDate(b.openings.end_at);
              const isBusy = busy === b.id;

              return (
                <div
                  key={b.id}
                  className="card-premium hover:scale-[1.01] transition-transform duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-bold text-white mb-1">
                          {startInfo.date}
                        </div>
                        <div className="text-white/70 mb-2">
                          {startInfo.time} - {endInfo.time}
                        </div>
                        <div className="text-sm text-white/50">
                          Client ID: <span className="font-mono">{b.client_id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        disabled={isBusy}
                        onClick={() => decide(b.id, 'decline')}
                        className="btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                      >
                        {isBusy ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          'Decline'
                        )}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => decide(b.id, 'accept')}
                        className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                      >
                        {isBusy ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Accepting...
                          </span>
                        ) : (
                          'Accept'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}




