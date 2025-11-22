"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .insert({ id: userId, email, full_name: fullName, role: "client" });
      if (profileErr) {
        setError(profileErr.message);
        setLoading(false);
        return;
      }
      // New signups are always clients, redirect to book page
      router.push("/book");
    } else {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <Image
          src="/softball-hero.jpg"
          alt="Softball player"
          fill
          priority
          quality={90}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/90 to-black/95" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-9 text-center">
          <p className="text-[0.55rem] uppercase tracking-[0.6em] text-white/40">The Collective Awaits</p>

          <div className="space-y-2">
            <Link
              href="/"
              className="text-[2.5rem] font-light uppercase tracking-[0.8em] text-white transition-colors hover:text-white/80"
            >
              5TH GEAR
            </Link>
            <p className="text-xs uppercase tracking-[0.45em] text-white/65">Create Account</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 text-left">
            <label className="block space-y-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/50">
              Full Name
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm text-white placeholder:text-white/45 transition-all focus:border-white focus:bg-white/10 focus:outline-none"
                placeholder="First Last"
                required
              />
            </label>

            <label className="block space-y-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/50">
              Email Address
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm text-white placeholder:text-white/45 transition-all focus:border-white focus:bg-white/10 focus:outline-none"
                placeholder="you@email.com"
                required
              />
            </label>

            <label className="block space-y-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/50">
              Password
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm text-white placeholder:text-white/45 transition-all focus:border-white focus:bg-white/10 focus:outline-none"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-3 text-center text-sm text-rose-50">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-full bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3 text-black/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Creating
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="flex items-center gap-3 text-[0.5rem] uppercase tracking-[0.5em] text-white/35">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/25 px-6 py-4 text-sm uppercase tracking-[0.35em] text-white/85 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <div className="space-y-3 text-center text-sm text-white/70">
            <Link href="/login" className="block text-xs uppercase tracking-[0.35em] text-white hover:text-white/80">
              Already with us? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
