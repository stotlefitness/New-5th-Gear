"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) {
      setError(signupError.message);
      setLoading(false);
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

      setLoading(false);
      router.push("/book");
    } else {
      setLoading(false);
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
        <Link href="/" className="auth-logo" style={{ textDecoration: "none", cursor: "pointer" }}>
          5TH&nbsp;GEAR
        </Link>
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
          <h1 className="auth-title">Create account.</h1>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="field-label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="field-input"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First Last"
              required
            />

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
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          {error && (
            <p className="auth-message error" role="alert">
              {error}
            </p>
          )}

          <p className="auth-secondary">
            Already with 5th Gear?{" "}
            <button
              type="button"
              className="inline-strong"
              onClick={() => router.push("/login")}
            >
              Log in
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
