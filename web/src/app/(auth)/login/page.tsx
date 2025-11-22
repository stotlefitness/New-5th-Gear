"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data?.user) {
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
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setForgotLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetMessage("Reset link sent. Check your email for instructions.");
    }
  }

  function handleSupportClick() {
    if (typeof window !== "undefined") {
      window.location.href = "mailto:support@5thgear.com";
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={() => router.back()}
        >
          ←
        </button>
        <div className="auth-logo">5TH&nbsp;GEAR</div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Menu"
          onClick={() => router.push("/")}
        >
          ☰
        </button>
      </header>

      <main className="auth-main">
        <section className="auth-panel">
          <h1 className="auth-title">Log in.</h1>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="field-input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />

            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <button
              type="button"
              className="inline-link"
              onClick={onForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? "Sending..." : "Forgot password?"}
            </button>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          {error && (
            <p className="auth-message error" role="alert">
              {error}
            </p>
          )}
          {resetMessage && (
            <p className="auth-message success" role="status">
              {resetMessage}
            </p>
          )}

          <p className="auth-secondary">
            New to 5th Gear?{" "}
            <button
              type="button"
              className="inline-strong"
              onClick={() => router.push("/signup")}
            >
              Create account
            </button>
          </p>

          <button type="button" className="inline-link small" onClick={handleSupportClick}>
            Need help? Contact support
          </button>
        </section>
      </main>
    </div>
  );
}
