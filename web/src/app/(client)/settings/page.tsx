"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

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

export default function ClientSettingsPage() {
  const { data: profile, mutate } = useSWR("client_profile", fetchProfile);
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
      <div className="client-page-inner">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ width: 48, height: 48, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="client-page-inner">
      <div className="client-header">
        <div className="client-header-label">Your training</div>
        <h1 className="client-header-title">Settings</h1>
        <p className="client-header-subtitle">
          Manage your profile, notifications, and payment details.
        </p>
      </div>

      <section className="client-card" style={{ maxWidth: 600, width: "100%" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, marginBottom: 6 }}>Profile Information</h2>
          <p style={{ fontSize: 13, opacity: 0.7 }}>Update your personal details</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
              }}
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
              }}
              placeholder="you@example.com"
            />
            <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Changing your email will require verification</p>
          </div>

          {/* Time Zone */}
          <div>
            <label htmlFor="timeZone" style={{ display: "block", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148, 163, 184, 0.8)", marginBottom: 6 }}>
              Time Zone
            </label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
              }}
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz} style={{ background: "#020617" }}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, color: "rgba(254, 226, 226, 0.9)", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{ padding: 12, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 12, color: "rgba(187, 247, 208, 0.9)", fontSize: 13 }}>
              Profile updated successfully!
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="client-btn"
            style={{ width: "100%", opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(2,6,23,0.3)", borderTopColor: "#020617", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </section>
    </div>
  );
}

