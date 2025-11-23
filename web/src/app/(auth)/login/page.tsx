"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);
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

  async function onForgotPassword() {
    if (!email) {
      setError("Enter your email address to receive a reset link.");
      return;
    }
    setForgotLoading(true);
    setError(null);
    setResetMessage(null);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setForgotLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetMessage("Reset link sent. Check your email for instructions.");
    }
  }

  return (
    <div className="auth-page">
      {/* Top nav */}
      <header className="auth-nav">
        <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
          ←
        </button>

        <Link href="/" className="auth-logo" style={{ textDecoration: "none", cursor: "pointer" }}>
          5TH GEAR
        </Link>

        <button className="icon-btn" aria-label="Menu">
          ☰
        </button>
      </header>

      {/* Centered login panel */}
      <main className="auth-main">
        <section className="auth-panel">
          <h1 className="auth-title">Log in.</h1>

          <form className="auth-form" onSubmit={onSubmit}>
            {/* Email */}
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="you@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password + forgot */}
            <div className="field-row">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                className="field-link"
                onClick={onForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? "Sending..." : "Forgot password?"}
              </button>
            </div>
            <input
              id="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            {resetMessage && (
              <p className="auth-success">
                {resetMessage}
              </p>
            )}

            {/* Primary button */}
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          {/* Secondary text */}
          <p className="auth-secondary">
            New to 5th Gear?{" "}
            <Link href="/signup" className="inline-strong">
              Create account
            </Link>
          </p>

          <button className="inline-link small">
            Need help? Contact support
          </button>
        </section>
      </main>
    </div>
  );
}
