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
    "w-full border-b border-white/30 bg-transparent pb-3 pt-1 text-base text-white placeholder-white/40 focus:border-white focus:outline-none focus:ring-0 transition-colors";

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
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/70 to-black/95" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-10 text-white/70">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/40 hover:text-white"
            aria-label="Back to home"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <span className="text-sm uppercase tracking-[0.8em]">5TH GEAR</span>
          <span className="w-10" aria-hidden />
        </header>

        <main className="flex flex-1 flex-col justify-between px-6 pb-10 pt-6">
          <div className="mx-auto w-full max-w-sm space-y-10">
            <div className="space-y-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.45em] text-white/45">Account access</p>
              <h1 className="text-4xl font-light tracking-[0.1em]">Log in</h1>
              <p className="text-sm text-white/60">Sign in to manage lessons, availability, and progress.</p>
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
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full rounded-full border border-white/60 py-4 text-sm font-semibold uppercase tracking-[0.45em] text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? "Signing in..." : "Log In"}
              </button>

              <div className="text-center text-[11px] uppercase tracking-[0.4em] text-white/60">
                Forgot your password?
              </div>
            </form>

            <div className="space-y-4 pt-4 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Have a 5th Gear band but no account?
              </p>
              <Link
                href="/signup"
                className="block rounded-full border border-white/60 py-4 text-sm font-semibold uppercase tracking-[0.45em] text-white transition-colors hover:border-white"
              >
                Create Account
              </Link>
              <button
                type="button"
                onClick={onGoogle}
                disabled={loading}
                className="w-full rounded-full border border-white/15 bg-white/5 py-3 text-[11px] uppercase tracking-[0.4em] text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue with Google
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm space-y-4 text-center text-[11px] uppercase tracking-[0.4em] text-white/55">
            <p className="transition-colors hover:text-white">Setup Instructions</p>
            <a href="mailto:support@5thgearpitching.com" className="transition-colors hover:text-white">
              Can't log in? Email support
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
