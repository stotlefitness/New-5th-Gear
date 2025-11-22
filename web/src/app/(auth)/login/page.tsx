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

  const inputStyles =
    "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all";

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
        <header className="px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5L7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-3 text-center">
              <h1 className="text-3xl font-medium">Sign in</h1>
              <p className="text-sm text-white/60">Welcome back</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <input
                id="email"
                className={inputStyles}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                id="password"
                className={inputStyles}
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full rounded-lg bg-white py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs text-white/40">
                <span className="bg-black/50 px-2">Or</span>
              </div>
            </div>

            <button
              onClick={onGoogle}
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with Google
            </button>

            <div className="text-center text-sm text-white/60">
              Don't have an account?{" "}
              <Link href="/signup" className="text-white hover:text-white/80 transition-colors underline">
                Sign up
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
