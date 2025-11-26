"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

type AccountType = "parent" | "player";
type PlayerStatus = "new" | "returning";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  
  // Step 1: Account type
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  
  // Step 2: Player status
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | null>(null);
  
  // Step 3: Account credentials
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Step 4: Player info
  const [playerName, setPlayerName] = useState("");
  const [handedness, setHandedness] = useState<"right" | "left" | "">("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function calculateHeightInches(): number | null {
    const feet = parseInt(heightFeet) || 0;
    const inches = parseInt(heightInches) || 0;
    if (feet === 0 && inches === 0) return null;
    return feet * 12 + inches;
  }

  function calculateAge(): number | null {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    if (age) return parseInt(age);
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create account
      const fullName = accountType === "parent" ? parentName : playerName;
      const { data, error: signupError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            role: "client",
            account_type: accountType
          }
        }
      });
      
      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is required
      if (data.user && !data.session) {
        setError("Please check your email to confirm your account before signing in.");
        setLoading(false);
        return;
      }

      if (!data.user?.id) {
        setError("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Create player profile
      const heightInches = calculateHeightInches();
      const playerAge = calculateAge();
      const weightLbs = weight ? parseInt(weight) : null;

      const { error: playerErr } = await supabase.rpc("create_player", {
        p_account_id: data.user.id,
        p_name: playerName,
        p_handedness: handedness || null,
        p_height_inches: heightInches,
        p_weight_lbs: weightLbs,
        p_age: playerAge,
        p_date_of_birth: dateOfBirth || null,
        p_player_status: playerStatus || "new",
        p_is_primary: true
      });

      if (playerErr) {
        setError(playerErr.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push("/book");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  }

  function handleNext() {
    if (currentStep === 1 && !accountType) {
      setError("Please select an account type");
      return;
    }
    if (currentStep === 2 && !playerStatus) {
      setError("Please select if you're a new or returning player");
      return;
    }
    setError(null);
    setCurrentStep(currentStep + 1);
  }

  function handleBack() {
    setError(null);
    setCurrentStep(currentStep - 1);
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

          {/* Step 1: Account Type */}
          {currentStep === 1 && (
            <div className="auth-form" style={{ gap: 16 }}>
              <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                Choose your account type
              </p>
              
              <button
                type="button"
                onClick={() => {
                  setAccountType("parent");
                  handleNext();
                }}
                className="btn-primary"
                style={{ width: "100%", padding: "16px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start" }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Parent Account</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>Manage multiple players from one account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType("player");
                  handleNext();
                }}
                className="btn-primary"
                style={{ width: "100%", padding: "16px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start" }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Player Account</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>Individual player account</span>
              </button>
            </div>
          )}

          {/* Step 2: New/Returning Player */}
          {currentStep === 2 && (
            <div className="auth-form" style={{ gap: 16 }}>
              <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                Are you a new or returning player?
              </p>
              
              <button
                type="button"
                onClick={() => {
                  setPlayerStatus("new");
                  handleNext();
                }}
                className="btn-primary"
                style={{ width: "100%", padding: "16px" }}
              >
                New Player
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlayerStatus("returning");
                  handleNext();
                }}
                className="btn-primary"
                style={{ width: "100%", padding: "16px" }}
              >
                Returning Player
              </button>

              <button type="button" onClick={handleBack} className="field-link" style={{ textAlign: "center", marginTop: 8 }}>
                ← Back
              </button>
            </div>
          )}

          {/* Step 3: Account Credentials */}
          {currentStep === 3 && (
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
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

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={handleBack} className="field-link" style={{ flex: 1, textAlign: "center", padding: "11px 0" }}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Next →
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Player Information */}
          {currentStep === 4 && (
            <form className="auth-form" onSubmit={handleSubmit}>
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

              <label className="field-label" htmlFor="dateOfBirth">
                Date of birth (optional)
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className="field-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={handleBack} className="field-link" style={{ flex: 1, textAlign: "center", padding: "11px 0" }}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? "Creating..." : "Create account"}
                </button>
              </div>
            </form>
          )}

          {error && currentStep < 4 && (
            <p className="auth-error" role="alert" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}

          <p className="auth-secondary" style={{ marginTop: 18 }}>
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
