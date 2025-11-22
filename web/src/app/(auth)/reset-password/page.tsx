"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "verifying" | "ready" | "missing" | "error";

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryToken = useMemo(
    () => searchParams.get("code") ?? searchParams.get("token_hash"),
    [searchParams],
  );

  const [status, setStatus] = useState<Status>("verifying");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "verifying") return;

    async function handleRecovery() {
      if (recoveryToken) {
        const { error } = await supabase.auth.exchangeCodeForSession(recoveryToken);
        if (error) {
          setStatus("error");
          setStatusMessage(error.message);
        } else {
          setStatus("ready");
          setStatusMessage(null);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("ready");
        setStatusMessage(null);
      } else {
        setStatus("missing");
        setStatusMessage("Reset link is missing or has expired. Request another from the login screen.");
      }
    }

    handleRecovery();
  }, [recoveryToken, status, supabase]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "ready") return;

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setSuccessMessage("Password updated. You can close this tab or head back to log in.");
    setPassword("");
    setConfirmPassword("");
  }

  const noticeText = status === "verifying" ? "Verifying reset link..." : statusMessage;
  const disableForm = status !== "ready" || submitting;

  return (
    <div className="auth-page">
      <header className="auth-nav">
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={() => router.push("/login")}
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
          <h1 className="auth-title">Reset password.</h1>
          <p className="auth-copy">
            Enter a new password for your account. Once saved, you can jump back to sign in.
          </p>

          {noticeText && status !== "ready" && (
            <p
              className={`auth-banner ${
                status === "error"
                  ? "error"
                  : status === "missing"
                  ? "warning"
                  : "info"
              }`}
              role={status === "error" ? "alert" : "status"}
            >
              {noticeText}
            </p>
          )}

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="field-label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className="field-input"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={disableForm}
              required
            />

            <label className="field-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="field-input"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={disableForm}
              required
            />

            <button type="submit" className="btn-primary" disabled={disableForm}>
              {submitting ? "Saving..." : "Update password"}
            </button>
          </form>

          {formError && (
            <p className="auth-message error" role="alert">
              {formError}
            </p>
          )}

          {successMessage && (
            <p className="auth-banner success" role="status">
              {successMessage}
            </p>
          )}

          <p className="auth-secondary">
            Ready to log in?{" "}
            <button
              type="button"
              className="inline-strong"
              onClick={() => router.push("/login")}
            >
              Back to login
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
