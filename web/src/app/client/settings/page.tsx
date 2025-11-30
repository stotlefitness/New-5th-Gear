"use client";

import { useEffect, useState } from "react";
import { ClientPageWrapper } from "@/components/ClientPageWrapper";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import { useRouter } from "next/navigation";

const supabase = getSupabaseBrowserClient();

type Profile = {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  time_zone: string;
};

type Player = {
  id: string;
  name: string;
  handedness: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  age: number | null;
};

async function fetchProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, account_type, time_zone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Profile not found");
  return data as Profile;
}

async function fetchPlayer(): Promise<Player | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("players")
    .select("id, name, handedness, height_inches, weight_lbs, age")
    .eq("account_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Player) || null;
}

export default function ClientSettingsPage() {
  const router = useRouter();
  const { data: profile, mutate: mutateProfile } = useSWR("client-profile", fetchProfile);
  const { data: player, mutate: mutatePlayer } = useSWR("client-player", fetchPlayer);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timeZone, setTimeZone] = useState("America/Chicago");
  const [playerName, setPlayerName] = useState("");
  const [handedness, setHandedness] = useState<"right" | "left" | "">("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
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

  useEffect(() => {
    if (player) {
      setPlayerName(player.name);
      setHandedness((player.handedness as "right" | "left") || "");
      const totalInches = player.height_inches || 0;
      setHeightFeet(Math.floor(totalInches / 12).toString());
      setHeightInches((totalInches % 12).toString());
      setWeight(player.weight_lbs?.toString() || "");
      setAge(player.age?.toString() || "");
    }
  }, [player]);

  const timeZones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];

  function calculateHeightInches(): number | null {
    const feet = parseInt(heightFeet) || 0;
    const inches = parseInt(heightInches) || 0;
    if (feet === 0 && inches === 0) return null;
    return feet * 12 + inches;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          time_zone: timeZone,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (emailError) throw emailError;
      }

      const heightInches = calculateHeightInches();
      const weightLbs = weight ? parseInt(weight) : null;
      const playerAge = age ? parseInt(age) : null;

      if (player) {
        const { error: playerError } = await supabase
          .from("players")
          .update({
            name: playerName.trim(),
            handedness: handedness || null,
            height_inches: heightInches,
            weight_lbs: weightLbs,
            age: playerAge,
          })
          .eq("id", player.id);

        if (playerError) throw playerError;
      } else if (playerName.trim()) {
        const { error: createError } = await supabase
          .from("players")
          .insert({
            account_id: user.id,
            name: playerName.trim(),
            handedness: handedness || null,
            height_inches: heightInches,
            weight_lbs: weightLbs,
            age: playerAge,
            is_primary: true,
          });

        if (createError) throw createError;
      }

      setSuccess(true);
      mutateProfile();
      mutatePlayer();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!profile) {
    return (
      <ClientPageWrapper title="Settings" subtitle="Manage your player profile and account details.">
        <div className="flex items-center justify-center px-4 py-32">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </ClientPageWrapper>
    );
  }

  return (
    <ClientPageWrapper title="Settings" subtitle="Manage your player profile and account details.">
      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="auth-panel" style={{ width: "100%" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 24 }}>
            Account information
          </h2>
          <div className="space-y-6">
            <div>
              <label className="field-label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="field-input"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field-input"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="field-label">Time zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="field-input"
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("America/", "").replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="auth-panel" style={{ width: "100%" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "rgba(255, 255, 255, 0.9)", marginBottom: 24 }}>
            Player profile
          </h2>
          <div className="space-y-6">
            <div>
              <label className="field-label">Player name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="field-input"
                placeholder="Player's full name"
              />
            </div>
            <div>
              <label className="field-label">Handedness</label>
              <select
                value={handedness}
                onChange={(e) => setHandedness(e.target.value as "right" | "left" | "")}
                className="field-input"
              >
                <option value="">Select</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label">Height (feet)</label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  className="field-input"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="field-label">Height (inches)</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  className="field-input"
                  placeholder="10"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label">Weight (lbs)</label>
                <input
                  type="number"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="field-input"
                  placeholder="150"
                />
              </div>
              <div>
                <label className="field-label">Age</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="field-input"
                  placeholder="16"
                />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "rgba(239, 68, 68, 0.9)",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(76, 175, 80, 0.1)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
              color: "rgba(76, 175, 80, 0.9)",
              fontSize: 14,
            }}
          >
            Settings updated successfully
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSignOut}
            className="field-link"
            style={{ fontSize: 13 }}
          >
            Sign out
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ fontSize: 13, padding: "12px 24px" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ClientPageWrapper>
  );
}

