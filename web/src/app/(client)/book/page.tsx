"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcRequestBooking } from '@/lib/rpc';
import { useState } from 'react';
import Navigation from '@/components/Navigation';

type Opening = { id: string; start_at: string; end_at: string; spots_available: number };

const fetcher = async () => {
  const supabase = getSupabaseBrowserClient();
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28);
  const { data, error } = await supabase
    .from('openings')
    .select('id,start_at,end_at,spots_available')
    .gte('start_at', from.toISOString())
    .lte('end_at', to.toISOString())
    .gt('spots_available', 0)
    .order('start_at');
  if (error) throw error;
  return data as Opening[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
  return 'Soon';
}

export default function BookPage() {
  const { data, error, isLoading, mutate } = useSWR('openings', fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function request(id: string) {
    try {
      setBusy(id);
      await rpcRequestBooking(id, crypto.randomUUID());
      setSuccessId(id);
      setTimeout(() => setSuccessId(null), 3000);
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <Navigation />

      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text font-[var(--font-space-grotesk)]">
              Book Your Lesson
            </h1>
            <p className="text-xl text-gray-400">Select an available time slot for your personalized coaching session</p>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card rounded-2xl p-6 shimmer h-32"></div>
              ))}
            </div>
          )}

          {error && (
            <div className="card rounded-2xl p-8 border-red-500/20 bg-red-500/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Openings</h3>
                  <p className="text-red-300">{String(error.message || error)}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {data && data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.map((opening) => {
                    const startDate = new Date(opening.start_at);
                    const endDate = new Date(opening.end_at);
                    const isBusy = busy === opening.id;
                    const isSuccess = successId === opening.id;

                    return (
                      <div
                        key={opening.id}
                        className={`card rounded-2xl p-6 transition-all duration-300 ${
                          isSuccess ? 'ring-2 ring-green-500/50 bg-green-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">📅</span>
                              <span className="text-sm text-purple-400 font-medium">
                                {getTimeUntil(startDate)}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">
                              {formatDate(startDate)}
                            </h3>
                            <p className="text-gray-400">
                              {formatTime(startDate)} - {formatTime(endDate)}
                            </p>
                          </div>
                          <div className="glass rounded-lg px-3 py-1.5">
                            <span className="text-sm font-semibold text-purple-400">
                              {opening.spots_available} {opening.spots_available === 1 ? 'spot' : 'spots'}
                            </span>
                          </div>
                        </div>

                        {isSuccess ? (
                          <div className="flex items-center gap-2 text-green-400 font-semibold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Request sent successfully!
                          </div>
                        ) : (
                          <button
                            disabled={isBusy}
                            onClick={() => request(opening.id)}
                            className="w-full btn-primary py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300"
                          >
                            {isBusy ? (
                              <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Requesting...
                              </>
                            ) : (
                              <>
                                <span>⚾</span>
                                Request Booking
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card rounded-2xl p-12 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-2xl font-bold text-white mb-2">No Available Openings</h3>
                  <p className="text-gray-400">
                    Check back soon for new time slots. We're adding more availability regularly!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}




