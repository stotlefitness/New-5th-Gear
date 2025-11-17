"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
        
        // Redirect based on role
        if (data?.role === "coach") {
          router.push("/availability");
          return;
        } else if (data?.role === "client") {
          router.push("/book");
          return;
        }
      }
      setLoading(false);
    });
  }, [router]);

  // Show loading or nothing while redirecting logged-in users
  if (loading || user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/5">
        <div className="w-full h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center pl-16">
            <span className="text-sm font-normal text-white tracking-[0.2em]">5TH GEAR</span>
          </Link>
          <div className="flex items-center gap-6 pr-16">
            {loading ? (
              <div className="w-20 h-6 bg-white/5 rounded-full animate-pulse"></div>
            ) : user ? (
              <Link
                href="/book"
                className="text-xs text-white font-normal tracking-[0.1em] hover:text-white/80 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs text-white font-normal tracking-[0.1em] border border-white/30 px-5 py-2.5 rounded-full hover:border-white/60 hover:bg-white/10 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs text-black bg-white hover:bg-white/95 px-6 py-2.5 rounded-full transition-all font-normal tracking-[0.1em]"
                >
                  Join Now
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative min-h-screen flex items-center justify-center px-8 py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/softball-hero.jpg"
            alt="Softball player"
            fill
            className="object-cover"
            style={{ objectPosition: '50% 30%' }}
            priority
            quality={90}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] text-white tracking-[-0.02em] text-center">
              <span className="block">The coaching proven</span>
              <span className="block mt-1">to build better pitchers</span>
            </h1>
            <p className="text-base sm:text-lg text-white/95 max-w-2xl mx-auto leading-[1.6] font-normal text-center">
              5th Gear combines elite coaching with personalized training to help you improve your mechanics, velocity, and control — starting day one.
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            {user ? (
              <Link
                href="/book"
                className="inline-block px-8 py-3 bg-white text-black hover:bg-white/95 rounded-full transition-all text-xs font-normal tracking-[0.05em]"
              >
                Book Session
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-block px-8 py-3 bg-white text-black hover:bg-white/95 rounded-full transition-all text-xs font-normal tracking-[0.05em]"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-xs text-white/30 uppercase tracking-widest font-light">© 2024 5th Gear Pitching</p>
        </div>
      </footer>
    </div>
  );
}
