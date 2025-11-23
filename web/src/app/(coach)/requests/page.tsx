"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcDecideBooking } from '@/lib/rpc';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

type Booking = { id: string; status: string; client_id: string; opening_id: string; openings: { start_at: string; end_at: string }; profiles: { full_name: string; email: string } | null };

const supabase = getSupabaseBrowserClient();

async function fetchPending() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,status,client_id,opening_id,openings(start_at,end_at),profiles:client_id(full_name,email)')
    .eq('status','pending')
    .order('created_at');
  if (error) throw error;
  return data as Booking[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function RequestsPage() {
  const { data, mutate, isLoading } = useSWR('coach_pending', fetchPending);
  const [busy, setBusy] = useState<string | null>(null);
  const [processedId, setProcessedId] = useState<string | null>(null);

  async function decide(id: string, decision: 'accept'|'decline') {
    try {
      setBusy(id);
      await rpcDecideBooking(id, decision);
      setProcessedId(id);
      setTimeout(() => setProcessedId(null), 2000);
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Navigation />

      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text font-[var(--font-space-grotesk)]">
              Booking Requests
            </h1>
            <p className="text-xl text-gray-400">Review and manage lesson booking requests from clients</p>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card rounded-2xl p-6 shimmer h-40"></div>
              ))}
            </div>
          )}

          {!isLoading && data && data.length > 0 && (
            <div className="space-y-4">
              {data.map((booking) => {
                const startDate = new Date(booking.openings.start_at);
                const endDate = new Date(booking.openings.end_at);
                const isBusy = busy === booking.id;
                const isProcessed = processedId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className={`card rounded-2xl p-6 transition-all duration-300 ${
                      isProcessed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {booking.client_id.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{booking.profiles?.full_name || 'Client Request'}</h3>
                            <p className="text-sm text-gray-400">{booking.profiles?.email || booking.client_id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="ml-16 space-y-1">
                          <div className="flex items-center gap-2 text-gray-300">
                            <span>📅</span>
                            <span className="font-medium">{formatDate(startDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <span>⏰</span>
                            <span>{formatTime(startDate)} - {formatTime(endDate)}</span>
                          </div>
                        </div>
                      </div>
                      {!isProcessed && (
                        <div className="flex flex-col sm:flex-row gap-3 md:ml-4">
                          <button
                            disabled={isBusy}
                            onClick={() => decide(booking.id, 'decline')}
                            className="px-6 py-3 glass rounded-xl text-white font-semibold border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isBusy ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <>
                                <span>❌</span>
                                Decline
                              </>
                            )}
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => decide(booking.id, 'accept')}
                            className="px-6 py-3 btn-primary rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isBusy ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <>
                                <span>✅</span>
                                Accept
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {isProcessed && (
                        <div className="flex items-center gap-2 text-green-400 font-semibold md:ml-4">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Processed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && (!data || data.length === 0) && (
            <div className="card rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📬</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Pending Requests</h3>
              <p className="text-gray-400">
                All caught up! New booking requests will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




