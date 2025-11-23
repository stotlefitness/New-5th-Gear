"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

      {/* Centered signup panel */}
      <main className="auth-main">
        <section className="auth-panel">
          <h1 className="auth-title">Create account.</h1>

          <form className="auth-form" onSubmit={onSubmit}>
            {/* Full Name */}
            <label className="field-label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              className="field-input"
              placeholder="John Doe"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

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

            {/* Password */}
            <label className="field-label" htmlFor="password">
              Password
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

            {error && (
              <p className="auth-error">
                {error}
              </p>
            )}

            {/* Primary button */}
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Secondary text */}
          <p className="auth-secondary">
            Already have an account?{" "}
            <Link href="/login" className="inline-strong">
              Log in
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
