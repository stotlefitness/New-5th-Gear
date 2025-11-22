"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data?.user) {
      // Get user role and redirect accordingly
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      
      if (profile?.role === "coach") {
        router.push("/availability");
      } else {
        router.push("/book");
      }
    }
  }

  async function onGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
  }

  const labelStyles = "text-[11px] uppercase tracking-[0.35em] text-white/50";
  const inputStyles =
    "w-full border-b border-white/25 bg-transparent pb-3 pt-1 text-lg text-white placeholder-white/30 focus:border-white focus:outline-none focus:ring-0 transition-colors";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Image
        src="/softball-hero.jpg"
        alt="Softball player"
        fill
        priority
        quality={90}
        className="absolute inset-0 object-cover object-center opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/95" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-light uppercase tracking-[0.3em] text-white/70 transition-colors hover:text-white"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 5L7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Back
          </Link>

          <span className="text-xs uppercase tracking-[0.6em] text-white/60">5TH GEAR</span>
          <span className="w-16" aria-hidden />
        </header>

        <main className="flex flex-1 flex-col items-center px-6 pb-12">
          <div className="w-full max-w-md space-y-10 rounded-[36px] bg-black/40 p-10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.6em] text-white/40">Welcome back</p>
              <h1 className="text-4xl font-light tracking-tight">Sign in</h1>
              <p className="text-sm text-white/60">Access your sessions, progress, and coaching updates.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="email" className={labelStyles}>
                  Email Address
                </label>
                <input
                  id="email"
                  className={inputStyles}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="password" className={labelStyles}>
                  Password
                </label>
                <input
                  id="password"
                  className={inputStyles}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full rounded-full bg-white/95 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div className="text-center text-[11px] uppercase tracking-[0.3em] text-white/50">
                Forgot your password?
              </div>
            </form>

            <div className="flex flex-col items-center gap-6">
              <div className="text-[11px] uppercase tracking-[0.35em] text-white/35">Or continue with</div>
              <button
                onClick={onGoogle}
                disabled={loading}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 text-lg font-semibold text-white transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Sign in with Google"
              >
                G
              </button>
            </div>

            <div className="space-y-3 text-center text-xs uppercase tracking-[0.35em] text-white/35">
              <p>
                Don't have an account?{" "}
                <Link href="/signup" className="text-white hover:text-white/80 transition-colors">
                  Sign up
                </Link>
              </p>
              <p className="text-[10px]">Need help? support@5thgearpitching.com</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
