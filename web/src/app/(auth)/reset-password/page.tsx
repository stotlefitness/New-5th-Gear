"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  }

  return (
    <div className="auth-page">
      {/* Top nav */}
      <header className="auth-nav">
        <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
          ←
        </button>

        <div className="auth-logo">5TH GEAR</div>

        <button className="icon-btn" aria-label="Menu">
          ☰
        </button>
      </header>

      {/* Centered reset password panel */}
      <main className="auth-main">
        <section className="auth-panel">
          <h1 className="auth-title">Set new password.</h1>

          {success ? (
            <div>
              <p className="auth-secondary" style={{ marginBottom: "24px" }}>
                Password updated successfully! Redirecting to login...
              </p>
              <Link href="/login" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <form className="auth-form" onSubmit={onSubmit}>
                {/* Password */}
                <label className="field-label" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  className="field-input"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />

                {/* Confirm Password */}
                <label className="field-label" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="field-input"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />

                {error && (
                  <p className="auth-error">
                    {error}
                  </p>
                )}

                {/* Primary button */}
                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? "Updating password..." : "Update password"}
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
