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
    <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/softball-hero.jpg"
          alt="Softball player"
          fill
          priority
          quality={90}
          className="object-cover object-center opacity-20"
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-16">
        <div className="w-full max-w-lg text-center space-y-6">
          <Link
            href="/"
            className="inline-block text-xs uppercase tracking-[0.3em] text-white/80 hover:text-white transition-colors"
          >
            5TH GEAR
          </Link>
          <h1 className="text-6xl font-light tracking-tight text-white">Join 5th Gear</h1>
          <p className="text-base text-white/60 font-light">Start your journey to pitching excellence</p>
        </div>

        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl">
          <div className="p-20">
            <form onSubmit={onSubmit} className="space-y-10">
              <div className="space-y-4">
                <label htmlFor="fullName" className="block text-sm text-white/70 font-light pl-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  className="w-full bg-white/5 border border-white/10 px-8 py-5 text-base text-white placeholder:text-sm placeholder-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <label htmlFor="email" className="block text-sm text-white/70 font-light pl-2">
                  Email
                </label>
                <input
                  id="email"
                  className="w-full bg-white/5 border border-white/10 px-8 py-5 text-base text-white placeholder:text-sm placeholder-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <label htmlFor="password" className="block text-sm text-white/70 font-light pl-2">
                  Password
                </label>
                <input
                  id="password"
                  className="w-full bg-white/5 border border-white/10 px-8 py-5 text-base text-white placeholder:text-sm placeholder-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full px-8 py-5 bg-white text-black hover:bg-white/95 transition-all font-normal text-base tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs tracking-[0.3em] uppercase text-white/30 font-light">
                <span className="px-4 bg-white/5">Or</span>
              </div>
            </div>

            <button
              onClick={onGoogle}
              disabled={loading}
              className="w-full px-8 py-5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            </button>

            <p className="text-center text-xs text-white/50 font-light mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:text-white/80 transition-colors font-normal">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
