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
      // Get user role first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        // No profile - redirect to complete account
        router.push("/complete-account");
        return;
      }

      // For coaches, profile existence is enough (no player_name needed)
      if (profile.role === "coach") {
        router.push("/availability");
        return;
      }

      // For clients, check if profile is complete (account_type and player_name)
      const meta = data.user.user_metadata || {};
      const isComplete = meta.account_type && meta.player_name;

      if (!isComplete) {
        router.push("/complete-account");
        return;
      }

      // Client profile is complete - redirect to book page
      router.push("/book");
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(error.message);
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

    // First, check if the email exists in the profiles table
    const { data: emailExists, error: checkError } = await supabase.rpc("check_email_exists", {
      p_email: email.trim()
    });

    if (checkError || !emailExists) {
      setForgotLoading(false);
      setError("No account found with this email address. Please check your email or create a new account.");
      return;
    }

    // If email exists, send reset link
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

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.1)" }} />
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.1)" }} />
          </div>

          {/* Google login button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-primary auth-submit"
            style={{
              background: "#fff",
              color: "#020617",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

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
