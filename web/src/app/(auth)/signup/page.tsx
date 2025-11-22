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
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/55 to-black/85" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
          <Link
            href="/"
            className="text-[clamp(3rem,6vw,4.5rem)] font-light uppercase tracking-[0.45em] text-white transition-colors hover:text-white/70"
          >
            5TH GEAR
          </Link>
          <p className="text-[0.55rem] uppercase tracking-[0.75em] text-[#73FFD1]/80">Membership Access</p>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-xl">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.7em] text-[#73FFD1]/80">Join the Collective</p>
              <h1 className="mt-5 text-3xl font-light uppercase tracking-[0.3em] text-white md:text-4xl">
                Create Account
              </h1>
              <p className="mt-3 text-sm text-white/70">
                Train like a pro. Recover like a scientist. Live in fifth gear.
              </p>
            </div>

            <div className="mt-10 rounded-[40px] border border-white/10 bg-black/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <form onSubmit={onSubmit} className="space-y-6 text-white">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="sr-only">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base text-white placeholder:text-white/50 transition-colors focus:border-[#73FFD1] focus:bg-white/10 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base text-white placeholder:text-white/50 transition-colors focus:border-[#73FFD1] focus:bg-white/10 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min. 6 characters)"
                    className="w-full rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base text-white placeholder:text-white/50 transition-colors focus:border-[#73FFD1] focus:bg-white/10 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <p className="rounded-full border border-rose-400/40 bg-rose-500/15 px-6 py-3 text-center text-sm text-rose-100">
                    {error}
                  </p>
                )}

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full rounded-full bg-white/95 px-8 py-4 text-sm font-semibold uppercase tracking-[0.35em] text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3 text-black/70">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Creating account
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <div className="flex items-center gap-3 text-[0.55rem] uppercase tracking-[0.5em] text-white/40">
                  <span className="h-px flex-1 bg-white/15" />
                  or
                  <span className="h-px flex-1 bg-white/15" />
                </div>

                <button
                  type="button"
                  onClick={onGoogle}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-white/30 px-8 py-4 text-sm uppercase tracking-[0.3em] text-white/80 transition-colors hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>

            <p className="mt-8 text-center text-sm text-white/70">
              Already with us?{" "}
              <Link href="/login" className="text-white transition-colors hover:text-white/80">
                Sign in
              </Link>
            </p>
          </div>
        </main>

        <footer className="px-6 pb-8">
          <div className="mx-auto h-[2px] w-28 rounded-full bg-white/30" />
        </footer>
      </div>
    </div>
  );
}
