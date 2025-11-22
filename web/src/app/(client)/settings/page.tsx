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
  account_type?: string;
  player_id?: string;
};

type PlayerProfile = {
  id: string;
  email: string;
  full_name: string;
  time_zone: string;
};

async function fetchProfile(): Promise<{ profile: Profile; playerProfile?: PlayerProfile }> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, time_zone, account_type, player_id")
    .eq("id", session.session.user.id)
    .single();
  
  if (error) throw error;
  const profile = data as Profile;

  // If parent account, fetch player profile
  let playerProfile: PlayerProfile | undefined;
  if (profile.account_type === "parent" && profile.player_id) {
    const { data: playerData, error: playerError } = await supabase
      .from("profiles")
      .select("id, email, full_name, time_zone")
      .eq("id", profile.player_id)
      .single();
    
    if (!playerError && playerData) {
      playerProfile = playerData as PlayerProfile;
    }
  }

  return { profile, playerProfile };
}

export default function ClientSettingsPage() {
  const { data: profileData, mutate } = useSWR("client_profile", fetchProfile);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timeZone, setTimeZone] = useState("America/Chicago");
  const [playerName, setPlayerName] = useState("");
  const [playerTimeZone, setPlayerTimeZone] = useState("America/Chicago");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const profile = profileData?.profile;
  const playerProfile = profileData?.playerProfile;
  const isParent = profile?.account_type === "parent";

  useEffect(() => {
    if (profile) {
      if (isParent && playerProfile) {
        // For parent accounts, show player info in the form
        setFullName(playerProfile.full_name);
        setEmail(playerProfile.email);
        setTimeZone(playerProfile.time_zone);
        setPlayerName(playerProfile.full_name);
        setPlayerTimeZone(playerProfile.time_zone);
      } else {
        // For player accounts, show their own info
        setFullName(profile.full_name);
        setEmail(profile.email);
        setTimeZone(profile.time_zone);
      }
    }
  }, [profile, playerProfile, isParent]);

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

      if (isParent && playerProfile) {
        // Update player profile (parent manages player's account)
        const { error: playerError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            time_zone: timeZone,
          })
          .eq("id", playerProfile.id);

        if (playerError) throw playerError;
      } else {
        // Update player's own profile
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Settings</h1>
        <p className="text-sm sm:text-base text-white/60">Manage your profile and preferences</p>
      </header>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 lg:p-16 space-y-8">
        <div>
          <h2 className="text-2xl font-light text-white mb-2">
            {isParent ? "Player Profile Information" : "Profile Information"}
          </h2>
          <p className="text-sm text-white/60">
            {isParent 
              ? "Manage the player's profile details" 
              : "Update your personal details"}
          </p>
          {isParent && (
            <p className="text-xs text-white/50 mt-2">
              You're managing this account as a parent/admin
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm text-white/70 font-light">
              {isParent ? "Player's Name" : "Full Name"}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all rounded-xl"
              placeholder={isParent ? "Player Name" : "John Doe"}
            />
          </div>

          {/* Email - For parent accounts, show player email but note it's managed */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm text-white/70 font-light">
              {isParent ? "Player Email (System Generated)" : "Email"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => !isParent && setEmail(e.target.value)}
              required
              disabled={isParent}
              className="w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
            {isParent ? (
              <p className="text-xs text-white/50">Player email is system-generated and cannot be changed</p>
            ) : (
              <p className="text-xs text-white/50">Changing your email will require verification</p>
            )}
          </div>

          {/* Time Zone */}
          <div className="space-y-2">
            <label htmlFor="timeZone" className="block text-sm text-white/70 font-light">
              Time Zone
            </label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all rounded-xl"
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz} className="bg-black">
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-200 text-sm rounded-xl">
              Profile updated successfully!
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-8 py-5 bg-white text-black hover:bg-white/95 transition-all font-normal text-base tracking-wide disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
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

