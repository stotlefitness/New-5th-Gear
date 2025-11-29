"use client";

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

type Status = "verifying" | "ready" | "missing" | "error";

function ResetPasswordForm() {
  const supabase = getSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const recoveryToken = useMemo(() => {
    return searchParams.get("code") ?? searchParams.get("token_hash");
  }, [searchParams]);
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
        setStatusMessage("Reset link is missing or has expired. Request a new email from the login page.");
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
    setSuccessMessage("Password updated. You can close this tab or continue to sign in.");
    setPassword("");
    setConfirmPassword("");
  }

  const noticeText = status === "verifying" ? "Verifying reset link..." : statusMessage;
  const disableForm = status !== "ready" || submitting;

  return (
    <div className="auth-page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-black/75 px-7 py-9 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="relative mb-9 flex items-center justify-center text-xs tracking-[0.35em] text-white/70">
            <Link
              href="/login"
              className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-lg text-white transition hover:border-white hover:text-white"
              aria-label="Back to login"
            >
              ←
            </Link>
            <Link href="/" className="cursor-pointer hover:text-white transition-colors" style={{ textDecoration: "none" }}>
              5TH&nbsp;GEAR
            </Link>
          </div>

          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Reset password.</h1>
          <p className="mb-7 text-sm text-white/70">
            Enter a new password for your account. Once saved, you can head back to sign in.
          </p>

          {noticeText && status !== "ready" && (
            <p
              className={`mb-5 rounded-2xl border px-4 py-3 text-center text-sm ${
                status === "error"
                  ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                  : status === "missing"
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-white/20 bg-white/5 text-white/80"
              }`}
            >
              {noticeText}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disableForm}
                minLength={6}
                className="mt-2 w-full border-b border-white/30 bg-transparent pb-3 text-base text-white placeholder:text-white/40 focus:border-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="••••••••"
                required
              />
            </label>

            <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-white/55">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={disableForm}
                minLength={6}
                className="mt-2 w-full border-b border-white/30 bg-transparent pb-3 text-base text-white placeholder:text-white/40 focus:border-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="••••••••"
                required
              />
            </label>

            {formError && (
              <p className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-center text-sm text-rose-100">
                {formError}
              </p>
            )}

            {successMessage && (
              <p className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-center text-sm text-emerald-100">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={disableForm}
              className="mt-3 w-full rounded-full bg-white px-6 py-3 text-base font-semibold tracking-wide text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3 text-black/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Saving
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/75">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-white hover:text-white/80">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
