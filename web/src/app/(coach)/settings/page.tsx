"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import CoachPageContainer from "@/components/CoachPageContainer";

const supabase = getSupabaseBrowserClient();

type Profile = {
  id: string;
  email: string;
  full_name: string;
  time_zone: string;
};

async function fetchProfile(): Promise<Profile> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, time_zone")
    .eq("id", session.session.user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

export default function SettingsPage() {
  const { data: profile, mutate } = useSWR("profile", fetchProfile);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timeZone, setTimeZone] = useState("America/Chicago");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setTimeZone(profile.time_zone);
    }
  }, [profile]);

  const timeZones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Not authenticated");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          time_zone: timeZone,
        })
        .eq("id", session.session.user.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (emailError) throw emailError;
      }

      setSuccess(true);
      mutate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <CoachPageContainer>
        <div className="text-center space-y-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/60">Loading settings…</p>
        </div>
      </CoachPageContainer>
    );
  }

  return (
    <CoachPageContainer>
      <header className="text-center space-y-6 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Account</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Settings</h1>
        <p className="text-sm sm:text-base text-white/60">Manage your profile and preferences</p>
      </header>

      <section className="auth-panel" style={{ maxWidth: 860, width: "100%" }}>
        <div className="auth-form" style={{ gap: 20 }}>
          <div>
            <label htmlFor="fullName" className="field-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="field-input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field-input"
              placeholder="you@example.com"
            />
            <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginTop: 6 }}>
              Changing your email will require verification
            </p>
          </div>

          <div>
            <label htmlFor="timeZone" className="field-label">
              Time Zone
            </label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="field-input"
              style={{ cursor: "pointer" }}
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz} style={{ background: "#0a0a0a", color: "#fff" }}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="auth-error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success" style={{ marginTop: 8 }}>
              Profile updated successfully!
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary auth-submit"
            style={{ marginTop: 8 }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </CoachPageContainer>
  );
}
