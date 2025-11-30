"use client";

import { useEffect, useState, FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AccountType = "parent" | "player";

export default function CompleteAccountPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [parentName, setParentName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [handedness, setHandedness] = useState<"right" | "left" | "">("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        router.push("/login");
        return;
      }

      // Check if already complete
      const meta = data.user.user_metadata || {};
      if (meta.account_type && meta.player_name) {
        // Profile already complete, redirect to dashboard
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "coach") {
          router.push("/availability");
        } else {
          router.push("/book");
        }
        return;
      }

      // Check for signup context in sessionStorage (from Google signup flow)
      const signupAccountType = typeof window !== "undefined" 
        ? sessionStorage.getItem("google_signup_account_type") || sessionStorage.getItem("signup_account_type")
        : null;
      const signupParentName = typeof window !== "undefined"
        ? sessionStorage.getItem("google_signup_parent_name") || sessionStorage.getItem("signup_parent_name")
        : null;

      // Pre-fill from signup context first, then from existing metadata
      if (signupAccountType) {
        setAccountType(signupAccountType as AccountType);
        // Clean up sessionStorage after reading
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("google_signup_account_type");
          sessionStorage.removeItem("signup_account_type");
        }
      } else if (meta.account_type) {
        setAccountType(meta.account_type);
      }

      if (signupParentName) {
        setParentName(signupParentName);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("google_signup_parent_name");
          sessionStorage.removeItem("signup_parent_name");
        }
      } else if (meta.parent_name) {
        setParentName(meta.parent_name);
      }

      if (meta.player_name) setPlayerName(meta.player_name);
      if (meta.handedness) setHandedness(meta.handedness);
      if (meta.height_feet) setHeightFeet(meta.height_feet.toString());
      if (meta.height_inches) setHeightInches(meta.height_inches.toString());
      if (meta.weight_lbs) setWeight(meta.weight_lbs.toString());
      if (meta.age) setAge(meta.age.toString());

      setChecking(false);
    }

    loadUser();
  }, [router, supabase]);

  function calculateHeightInches(): number | null {
    const feet = parseInt(heightFeet) || 0;
    const inches = parseInt(heightInches) || 0;
    if (feet === 0 && inches === 0) return null;
    return feet * 12 + inches;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!accountType) {
      setError("Please select an account type");
      setLoading(false);
      return;
    }
    if (accountType === "parent" && !parentName.trim()) {
      setError("Please enter parent name");
      setLoading(false);
      return;
    }
    if (!playerName.trim()) {
      setError("Please enter player name");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      const heightInches = calculateHeightInches();
      const weightLbs = weight ? parseInt(weight) : null;
      const playerAge = age ? parseInt(age) : null;

      const fullName = accountType === "parent" ? parentName : playerName;

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          account_type: accountType,
          parent_name: accountType === "parent" ? parentName : undefined,
          player_name: playerName,
          handedness: handedness || null,
          height_feet: heightFeet ? parseInt(heightFeet) : null,
          height_inches: heightInches,
          weight_lbs: weightLbs,
          age: playerAge,
        },
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Wait a bit for trigger to potentially update profile
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update profile if it exists (ensure account_type is set)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          account_type: accountType as any,
        })
        .eq("id", user.id);

      // Profile update error is not critical - metadata update is what matters
      if (profileErr) {
        console.warn("Profile update error:", profileErr);
      }

      // Create player profile
      const { error: playerErr } = await supabase.rpc("create_player", {
        p_account_id: user.id,
        p_name: playerName,
        p_handedness: handedness || null,
        p_height_inches: heightInches,
        p_weight_lbs: weightLbs,
        p_age: playerAge,
        p_date_of_birth: null,
        p_player_status: "new",
        p_is_primary: true,
      });

      if (playerErr) {
        setError(playerErr.message);
        setLoading(false);
        return;
      }

      // Profile complete - redirect to dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setLoading(false);
      if (profile?.role === "coach") {
        router.push("/availability");
      } else {
        router.push("/book");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

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
          <h1 className="auth-title">Complete your 5th Gear profile.</h1>
          <p className="auth-secondary" style={{ marginBottom: 24 }}>
            Just a few details so we can personalize your coaching.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Account Type - only show if not already set */}
            {!accountType && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                  Choose your account type
                </p>
                
                <button
                  type="button"
                  onClick={() => setAccountType("parent")}
                  style={{ 
                    width: "100%", 
                    padding: "16px", 
                    textAlign: "left", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "flex-start",
                    background: accountType === "parent" ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.1)",
                    border: accountType === "parent" ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "999px",
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#ffffff" }}>Parent Account</span>
                  <span style={{ fontSize: 13, opacity: 0.9, color: "rgba(255, 255, 255, 0.9)" }}>Manage multiple players from one account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("player")}
                  style={{ 
                    width: "100%", 
                    padding: "16px", 
                    textAlign: "left", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "flex-start",
                    background: accountType === "player" ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.1)",
                    border: accountType === "player" ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "999px",
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#ffffff" }}>Player Account</span>
                  <span style={{ fontSize: 13, opacity: 0.9, color: "rgba(255, 255, 255, 0.9)" }}>Individual player account</span>
                </button>
              </div>
            )}

            {accountType === "parent" && (
              <>
                <label className="field-label" htmlFor="parentName">
                  Parent name
                </label>
                <input
                  id="parentName"
                  className="field-input"
                  autoComplete="name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="First Last"
                  required
                />
              </>
            )}

            <label className="field-label" htmlFor="playerName">
              Player name
            </label>
            <input
              id="playerName"
              className="field-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="First Last"
              required
            />

            <label className="field-label" htmlFor="handedness">
              Handedness
            </label>
            <select
              id="handedness"
              className="field-input"
              value={handedness}
              onChange={(e) => setHandedness(e.target.value as "right" | "left" | "")}
              style={{ cursor: "pointer" }}
            >
              <option value="">Select...</option>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="heightFeet">
                  Height (feet)
                </label>
                <input
                  id="heightFeet"
                  type="number"
                  className="field-input"
                  min="0"
                  max="8"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="heightInches">
                  Height (inches)
                </label>
                <input
                  id="heightInches"
                  type="number"
                  className="field-input"
                  min="0"
                  max="11"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="weight">
                  Weight (lbs)
                </label>
                <input
                  id="weight"
                  type="number"
                  className="field-input"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="150"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="age">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  className="field-input"
                  min="0"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="16"
                />
              </div>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </form>

          <button type="button" className="inline-link small" onClick={() => router.push("/login")} style={{ marginTop: 18 }}>
            Need help? Contact support
          </button>
        </section>
      </main>
    </div>
  );
}
