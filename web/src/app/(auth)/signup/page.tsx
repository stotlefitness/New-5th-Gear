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
  const [accountType, setAccountType] = useState<"parent" | "player">("player");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate parent account has player name
    if (accountType === "parent" && !playerName.trim()) {
      setError("Please enter the player's name");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      if (accountType === "parent") {
        // Call server-side API to create parent account with player profile
        const response = await fetch("/api/signup-parent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: userId,
            parentEmail: email,
            parentName: fullName,
            playerName: playerName.trim(),
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to create parent account");
          setLoading(false);
          return;
        }
      } else {
        // Create player profile
        const { error: profileErr } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email,
            full_name: fullName,
            role: "client",
            account_type: "player",
          });

        if (profileErr) {
          setError(profileErr.message);
          setLoading(false);
          return;
        }
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
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
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

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center">
            <Link
              href="/"
              className="inline-block text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors mb-8"
            >
              5TH GEAR
            </Link>
            <h1 className="text-4xl font-light tracking-tight text-white mb-2">Join 5th Gear</h1>
            <p className="text-sm text-white/50">Start your journey to pitching excellence</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Account Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType("player");
                    setPlayerName("");
                  }}
                  className={`flex-1 px-4 py-3 border rounded-lg transition-all text-sm ${
                    accountType === "player"
                      ? "border-white/40 bg-white/5 text-white"
                      : "border-white/20 text-white/60 hover:border-white/30"
                  }`}
                >
                  Player
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("parent")}
                  className={`flex-1 px-4 py-3 border rounded-lg transition-all text-sm ${
                    accountType === "parent"
                      ? "border-white/40 bg-white/5 text-white"
                      : "border-white/20 text-white/60 hover:border-white/30"
                  }`}
                >
                  Parent
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-xs text-white/70 mb-2">
                {accountType === "parent" ? "Your Name (Parent)" : "Full Name"}
              </label>
              <input
                id="fullName"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-colors"
                placeholder={accountType === "parent" ? "Jane Doe" : "John Doe"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {accountType === "parent" && (
              <div>
                <label htmlFor="playerName" className="block text-xs text-white/70 mb-2">
                  Player's Name
                </label>
                <input
                  id="playerName"
                  className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-colors"
                  placeholder="Sarah Doe"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
                <p className="text-xs text-white/40 mt-2">
                  The account will be associated with the player. You'll manage it as an admin.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs text-white/70 mb-2">
                Email
              </label>
              <input
                id="email"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-colors"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs text-white/70 mb-2">
                Password
              </label>
              <input
                id="password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none transition-colors"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 transition-all font-medium text-sm py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-white/40">
              <span className="px-3 bg-black">Or</span>
            </div>
          </div>

          <button
            onClick={onGoogle}
            disabled={loading}
            className="w-full border border-white/20 hover:border-white/30 transition-all rounded-lg py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
            <span className="text-sm text-white">Continue with Google</span>
          </button>

          <p className="text-center text-xs text-white/50 mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:text-white/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
