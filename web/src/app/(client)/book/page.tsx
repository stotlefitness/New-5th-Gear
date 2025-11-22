"use client";

import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcRequestBooking } from "@/lib/rpc";
import { useState } from "react";

type Opening = {
  id: string;
  start_at: string;
  end_at: string;
  spots_available: number;
};

const fetcher = async () => {
  const supabase = getSupabaseBrowserClient();
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 28);
  const { data, error } = await supabase
    .from("openings")
    .select("id,start_at,end_at,spots_available")
    .gte("start_at", from.toISOString())
    .lte("end_at", to.toISOString())
    .gt("spots_available", 0)
    .order("start_at");
  if (error) throw error;
  return data as Opening[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function groupOpeningsByDate(openings: Opening[]): Map<string, Opening[]> {
  const grouped = new Map<string, Opening[]>();
  openings.forEach((opening) => {
    const date = new Date(opening.start_at);
    const dateKey = date.toDateString();
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(opening);
  });
  return grouped;
}

export default function BookPage() {
  const { data, error, isLoading, mutate } = useSWR("openings", fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function request(id: string) {
    try {
      setBusy(id);
      await rpcRequestBooking(id, crypto.randomUUID());
      await mutate();
    } catch (e: any) {
      alert(e.message || "Request failed");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-[#C73E2A]/30 border-t-[#C73E2A] rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-400">Loading available sessions...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="card relative p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2 text-white">Error</h2>
          <p className="text-sm text-red-400">{String(error.message || error)}</p>
        </div>
      </div>
    );

  const groupedOpenings = data ? groupOpeningsByDate(data) : new Map();
  const dates = Array.from(groupedOpenings.keys()).sort();

  return (
    <div className="min-h-screen bg-black px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-white tracking-tight">
            Book Your <span className="text-[#C73E2A]">Session</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">Select an available time slot for your pitching session</p>
        </div>

        {dates.length === 0 ? (
          <div className="card relative p-8 sm:p-12 text-center">
            <h2 className="text-xl font-bold mb-2 text-white">No sessions available</h2>
            <p className="text-sm text-gray-400">Check back soon for new availability</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {dates.map((dateKey) => {
              const openings = groupedOpenings.get(dateKey)!;
              const date = new Date(dateKey);
              const isSelected = selectedDate === dateKey || dates.length === 1;

              return (
                <div
                  key={dateKey}
                  className="card relative p-4 sm:p-6 lg:p-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-1 text-white">{formatDate(date)}</h2>
                      <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">
                        {openings.length} {openings.length === 1 ? "session" : "sessions"} available
                      </p>
                    </div>
                    {dates.length > 1 && (
                      <button
                        onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                        className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800/50 hover:border-gray-700 transition-all duration-300 text-xs sm:text-sm font-medium w-fit"
                      >
                        {isSelected ? "Collapse" : "Expand"}
                      </button>
                    )}
                  </div>

                  {isSelected && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {openings.map((opening: Opening) => {
                        const startDate = new Date(opening.start_at);
                        const endDate = new Date(opening.end_at);
                        const isBusy = busy === opening.id;

                        return (
                          <div
                            key={opening.id}
                            className="p-4 rounded-lg bg-gray-900/50 border border-gray-800/50 hover:border-[#C73E2A]/30 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="text-base sm:text-lg font-bold mb-0.5 text-white">{formatTime(startDate)}</div>
                                <div className="text-xs sm:text-sm text-gray-400">until {formatTime(endDate)}</div>
                              </div>
                              <div className="px-2 py-1 rounded bg-[#C73E2A]/20 text-[#C73E2A] text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                                {opening.spots_available} {opening.spots_available === 1 ? "spot" : "spots"}
                              </div>
                            </div>

                            <button
                              disabled={isBusy}
                              onClick={() => request(opening.id)}
                              className="w-full px-3 py-2 rounded-lg bg-[#C73E2A] hover:bg-[#8B2E1F] transition-all duration-300 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isBusy ? (
                                <span className="flex items-center justify-center">
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                                  Requesting...
                                </span>
                              ) : (
                                "Request Session"
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
