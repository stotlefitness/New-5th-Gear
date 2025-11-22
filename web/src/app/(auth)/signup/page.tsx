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
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#121f30_0%,rgba(0,0,0,0.65)_55%,#000_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-black/75 px-7 py-9 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="relative mb-9 flex items-center justify-center text-xs tracking-[0.35em] text-white/70">
            <Link
              href="/"
              className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-lg text-white transition hover:border-white hover:text-white"
              aria-label="Back"
            >
              ←
            </Link>
            5TH&nbsp;GEAR
          </div>

          <h1 className="mb-1 text-3xl font-semibold tracking-tight">Create account.</h1>
          <p className="mb-7 text-sm text-white/70">
            Join the performance stack. Build your 5th Gear profile and unlock booking, tracking, and benchmarks.
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
              Full name
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full border-b border-white/30 bg-transparent pb-3 text-base text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                placeholder="First Last"
                required
              />
            </label>

            <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
              Email address
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-b border-white/30 bg-transparent pb-3 text-base text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                placeholder="you@email.com"
                required
              />
            </label>

            <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
              Password
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border-b border-white/30 bg-transparent pb-3 text-base text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-center text-sm text-rose-100">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="mt-3 w-full rounded-full bg-white px-6 py-3 text-base font-semibold tracking-wide text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3 text-black/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Creating
                </span>
              ) : (
                "Create account"
              )}
            </button>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
              className="w-full rounded-full border border-white/40 px-6 py-3 text-base font-medium tracking-wide text-white transition hover:border-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/75">
            Already with us?{" "}
            <Link href="/login" className="font-medium text-white hover:text-white/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
