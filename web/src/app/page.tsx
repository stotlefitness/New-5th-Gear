"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
          router.push("/schedule");
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
    <div className="page">
      <header className="nav">
        <div className="nav-left">
          <Link href="/">
            <span className="logo-text">5TH GEAR</span>
          </Link>
        </div>
        <div className="nav-right">
          <Link href="/login" className="btn btn-ghost">
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-outline">
            Join Now
          </Link>
        </div>
      </header>

      <main className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">
            The coaching proven
            <br />
            to build better pitchers
          </h1>
          <p className="hero-subtitle">
            5th Gear combines elite coaching with personalized training to help you improve your
            mechanics, velocity, and control — starting day one.
          </p>
          <Link href="/signup" className="btn btn-primary hero-cta">
            Get Started
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/20 bg-black/60 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-xs text-white/50 uppercase tracking-[0.28em] font-light">
            © 2024 5th Gear Pitching
          </p>
        </div>
      </footer>
    </div>
  );
}
