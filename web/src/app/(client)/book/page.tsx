"use client";
import useSWR from 'swr';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcRequestBooking } from '@/lib/rpc';
import { useState } from 'react';

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

export default function BookPage() {
  const { data, error, isLoading, mutate } = useSWR('openings', fetcher);
  const [busy, setBusy] = useState<string | null>(null);

  async function request(id: string) {
    try {
      setBusy(id);
      await rpcRequestBooking(id, crypto.randomUUID());
      await mutate();
    } catch (e: any) {
      alert(e.message || 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      fullDate: date,
    };
  };

  const groupByDate = (openings: Opening[]) => {
    const groups: { [key: string]: Opening[] } = {};
    openings.forEach((opening) => {
      const date = new Date(opening.start_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(opening);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/60">Loading available sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-premium max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-white">Oops!</h2>
          <p className="text-red-400 mb-4">{String(error.message || error)}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const groupedOpenings = data ? groupByDate(data) : {};
  const dates = Object.keys(groupedOpenings).sort();

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Book Your Lesson</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Select from available time slots for the next 4 weeks. Secure your spot and elevate your game.
          </p>
        </div>

        {dates.length === 0 ? (
          <div className="card-premium text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold mb-2 text-white">No Available Sessions</h2>
            <p className="text-white/60">Check back soon for new time slots!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map((dateKey) => {
              const openings = groupedOpenings[dateKey];
              const firstOpening = openings[0];
              const dateInfo = formatDate(firstOpening.start_at);

              return (
                <div key={dateKey} className="card-premium">
                  <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{dateInfo.date}</h2>
                      <p className="text-sm text-white/50">{openings.length} session{openings.length !== 1 ? 's' : ''} available</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {openings.map((opening) => {
                      const startInfo = formatDate(opening.start_at);
                      const endInfo = formatDate(opening.end_at);
                      const isBusy = busy === opening.id;

                      return (
                        <div
                          key={opening.id}
                          className="group relative p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:transform hover:scale-105"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="text-2xl font-bold text-white mb-1">
                                {startInfo.time}
                              </div>
                              <div className="text-sm text-white/60">
                                Until {endInfo.time}
                              </div>
                            </div>
                            <div className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">
                              {opening.spots_available} spot{opening.spots_available !== 1 ? 's' : ''}
                            </div>
                          </div>

                          <button
                            disabled={isBusy}
                            onClick={() => request(opening.id)}
                            className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                              isBusy
                                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                : 'btn-primary'
                            }`}
                          >
                            {isBusy ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Requesting...
                              </span>
                            ) : (
                              'Request Session'
                            )}
                          </button>
                        </div>
                      );
                    })}
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




