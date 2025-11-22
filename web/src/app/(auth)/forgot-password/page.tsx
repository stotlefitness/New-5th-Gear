"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="auth-page">
      {/* Top nav */}
      <header className="auth-nav">
        <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
          ←
        </button>

        <Link href="/" className="auth-logo">5TH GEAR</Link>

        <button className="icon-btn" aria-label="Menu">
          ☰
        </button>
      </header>

      {/* Centered forgot password panel */}
      <main className="auth-main">
        <section className="auth-panel">
          <h1 className="auth-title">Reset password.</h1>

          {success ? (
            <div>
              <p className="auth-secondary" style={{ marginBottom: "24px" }}>
                Check your email for a password reset link. If you don't see it, check your spam folder.
              </p>
              <Link href="/login" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="auth-secondary" style={{ marginBottom: "24px" }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

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

                {error && (
                  <p className="auth-error">
                    {error}
                  </p>
                )}

                {/* Primary button */}
                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              {/* Secondary text */}
              <p className="auth-secondary">
                Remember your password?{" "}
                <Link href="/login" className="inline-strong">
                  Log in
                </Link>
              </p>
            </>
          )}

          <button className="inline-link small">
            Need help? Contact support
          </button>
        </section>
      </main>
    </div>
  );
}
