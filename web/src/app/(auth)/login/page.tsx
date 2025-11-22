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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="px-6 pt-12 text-center text-[0.6rem] uppercase tracking-[0.5em] text-white/60">
          A 5TH GEAR ACCOUNT IS REQUIRED
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 pb-16">
          <div className="mx-auto w-full max-w-md text-center">
            <Link
              href="/"
              className="text-5xl font-light leading-none tracking-[0.35em] text-white hover:text-white/80 transition-colors md:text-6xl"
            >
              5TH GEAR
            </Link>
            <p className="mt-6 text-sm uppercase tracking-[0.4em] text-white/60">Unlock Yourself</p>
          </div>

          <form onSubmit={onSubmit} className="mx-auto mt-12 w-full max-w-md space-y-5 text-white">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base placeholder:text-white/50 focus:border-white focus:bg-white/10 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base placeholder:text-white/50 focus:border-white focus:bg-white/10 focus:outline-none transition-colors"
                required
              />
            </div>

            {error && (
              <p className="rounded-full border border-rose-500/40 bg-rose-500/10 px-6 py-3 text-center text-sm text-rose-100">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-full bg-white px-8 py-4 text-base font-medium tracking-[0.2em] uppercase text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3 text-black/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"></span>
                  Signing in
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            <button
              type="button"
              onClick={onGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/40 px-8 py-4 text-base tracking-[0.2em] uppercase text-white/80 transition-colors hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="mt-8 text-center text-sm text-white/70">
            Need an account?{" "}
            <Link href="/signup" className="text-white transition-colors hover:text-white/80">
              Create one
            </Link>
          </div>

          <div className="mx-auto mt-12 h-1 w-24 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
