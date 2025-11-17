"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading || !user) return null;

  const isCoach = profile?.role === "coach";

  return (
    <nav className="sticky top-0 z-50 h-16 backdrop-blur-md bg-black/80 border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="logo-number text-5xl">
            5
            <span className="logo-dot"></span>
          </span>
          <span className="text-xl font-bold text-white tracking-tight">5th Gear</span>
        </Link>

        <div className="flex items-center space-x-1 h-full">
          {isCoach ? (
            <>
              <Link
                href="/availability"
                className={`h-full flex items-center px-4 border-b-2 transition-all duration-300 ${
                  pathname === "/availability"
                    ? "border-[#C73E2A] text-white bg-[#C73E2A]/10"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                Availability
              </Link>
              <Link
                href="/requests"
                className={`h-full flex items-center px-4 border-b-2 transition-all duration-300 relative ${
                  pathname === "/requests"
                    ? "border-[#C73E2A] text-white bg-[#C73E2A]/10"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                Requests
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/book"
                className={`h-full flex items-center px-4 border-b-2 transition-all duration-300 ${
                  pathname === "/book"
                    ? "border-[#C73E2A] text-white bg-[#C73E2A]/10"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                Book Session
              </Link>
              <Link
                href="/messages"
                className={`h-full flex items-center px-4 border-b-2 transition-all duration-300 ${
                  pathname === "/messages"
                    ? "border-[#C73E2A] text-white bg-[#C73E2A]/10"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                Messages
              </Link>
              <Link
                href="/settings"
                className={`h-full flex items-center px-4 border-b-2 transition-all duration-300 ${
                  pathname === "/settings"
                    ? "border-[#C73E2A] text-white bg-[#C73E2A]/10"
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                Settings
              </Link>
            </>
          )}

          <button
            onClick={handleSignOut}
            className="ml-4 px-4 py-2 text-sm text-gray-400 hover:text-white transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
