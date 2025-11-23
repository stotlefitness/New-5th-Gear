"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";
import CoachPageContainer from "@/components/CoachPageContainer";
import CoachNavigation from "@/components/CoachNavigation";
import Navigation from "@/components/Navigation";
import { useRouter } from "next/navigation";

const supabase = getSupabaseBrowserClient();

type Profile = {
  id: string;
  email: string;
  full_name: string;
  time_zone: string;
  role: "coach" | "client";
};

async function fetchProfile(): Promise<Profile> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, time_zone, role")
    .eq("id", session.session.user.id)
    .single();
  
  if (error) throw error;
  return data as Profile;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: profile, mutate } = useSWR("settings_profile", fetchProfile);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (profile === undefined) return; // Still loading
    if (!profile) {
      router.push("/login");
    }
  }, [profile, router]);

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
    const loadingSpinner = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );

    if (profile === undefined) {
      // Still loading - show with appropriate layout
      return (
        <>
          <Navigation />
          <main className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}>
            <div className="w-full max-w-3xl px-6 sm:px-8 lg:px-12">
              {loadingSpinner}
            </div>
          </main>
        </>
      );
    }
    return null;
  }

  const isCoach = profile.role === "coach";

  const settingsContent = (
    <div className="space-y-8">
      <header className="text-center space-y-6">
        {isCoach && <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>}
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Settings</h1>
        <p className="text-sm sm:text-base text-white/60">Manage your profile and preferences</p>
      </header>

      <section className={`rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 lg:p-16 space-y-8 ${!isCoach ? '' : ''}`}>
        <div>
          <h2 className="text-2xl font-light text-white mb-2">Profile Information</h2>
          <p className="text-sm text-white/60">Update your personal details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm text-white/70 font-light">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={`w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all ${isCoach ? '' : 'rounded-xl'}`}
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm text-white/70 font-light">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all ${isCoach ? '' : 'rounded-xl'}`}
              placeholder="you@example.com"
            />
            <p className="text-xs text-white/50">Changing your email will require verification</p>
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
              className={`w-full bg-white/5 border border-white/10 px-6 py-4 text-base text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all ${isCoach ? '' : 'rounded-xl'}`}
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

  // Render with appropriate layout based on role
  if (isCoach) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
        </div>

        <CoachNavigation />

        <main className="relative z-10 flex items-center justify-center" style={{ height: 'calc(100vh - 80px)', marginTop: '80px' }}>
          <div className="w-full max-w-3xl px-6 sm:px-8 lg:px-12">
            <CoachPageContainer>
              {settingsContent}
            </CoachPageContainer>
          </div>
        </main>
      </div>
    );
  }

  // Client layout
  return (
    <>
      <Navigation />
      <main className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}>
        <div className="w-full max-w-3xl px-6 sm:px-8 lg:px-12">
          {settingsContent}
        </div>
      </main>
    </>
  );
}

