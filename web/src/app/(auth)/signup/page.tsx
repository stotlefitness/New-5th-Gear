"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

type AccountType = "parent" | "player";
type PlayerStatus = "new" | "returning";

function SignupPageContent() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const [created, setCreated] = useState(false);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);

  // Check if coming from Google signup
  useEffect(() => {
    const step = searchParams?.get("step");
    if (step === "4") {
      // Check for Google signup data in sessionStorage
      const googleAccountType = typeof window !== "undefined"
        ? sessionStorage.getItem("google_signup_account_type")
        : null;
      const googlePlayerStatus = typeof window !== "undefined"
        ? sessionStorage.getItem("google_signup_player_status")
        : null;
      const googleParentName = typeof window !== "undefined"
        ? sessionStorage.getItem("google_signup_parent_name")
        : null;

      if (googleAccountType) {
        setAccountType(googleAccountType as AccountType);
        setPlayerStatus((googlePlayerStatus || "new") as PlayerStatus);
        setParentName(googleParentName || "");
        setCurrentStep(4);
        setIsGoogleSignup(true);

        // Clean up sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("google_signup_account_type");
          sessionStorage.removeItem("google_signup_player_status");
          sessionStorage.removeItem("google_signup_parent_name");
        }
      }
    }
  }, [searchParams]);

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
      let userId: string;

      if (isGoogleSignup) {
        // User is already authenticated via Google
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError("Not authenticated. Please try again.");
          setLoading(false);
          return;
        }
        userId = user.id;

        // Update user metadata if needed
        const fullName = accountType === "parent" ? parentName : playerName;
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            account_type: accountType,
            parent_name: accountType === "parent" ? parentName : undefined,
          },
        });
      } else {
        // Regular email/password signup
        if (!email.trim()) {
          setError("Please enter email address");
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

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

        if (!data.user?.id) {
          setError("Failed to create account. Please try again.");
          setLoading(false);
          return;
        }

        userId = data.user.id;

        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Create player profile
      const heightInches = calculateHeightInches();
      const playerAge = calculateAge();
      const weightLbs = weight ? parseInt(weight) : null;

      const { error: playerErr } = await supabase.rpc("create_player", {
        p_account_id: userId,
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

      // ✅ Account successfully created
      setLoading(false);
      setCreated(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  }

  function handleNext(selectedAccountType?: AccountType, selectedPlayerStatus?: PlayerStatus) {
    if (currentStep === 1) {
      const typeToCheck = selectedAccountType ?? accountType;
      if (!typeToCheck) {
        setError("Please select an account type");
        return;
      }
      setAccountType(typeToCheck);
    }
    if (currentStep === 2) {
      const statusToCheck = selectedPlayerStatus ?? playerStatus;
      if (!statusToCheck) {
        setError("Please select if you're a new or returning player");
        return;
      }
      setPlayerStatus(statusToCheck);
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

  function goToLogin() {
    router.push("/login");
  }

  async function handleGoogleSignup() {
    if (!accountType) {
      setError("Please select an account type first");
      return;
    }

    // If parent account, require parent name
    if (accountType === "parent" && !parentName.trim()) {
      setError("Please enter parent name first");
      return;
    }

    // Store account type and player status in sessionStorage for after OAuth
    if (typeof window !== "undefined") {
      sessionStorage.setItem("signup_account_type", accountType);
      sessionStorage.setItem("signup_player_status", playerStatus || "new");
      sessionStorage.setItem("signup_parent_name", parentName);
    }

    // Redirect to Google OAuth with redirect to signup completion
    // Use window.location.origin to work in both dev and production
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/signup/complete`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  }

  // Success state
  if (created) {
    return (
      <div className="auth-page">
        <header className="auth-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Back"
            onClick={() => router.push("/")}
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
            <h1 className="auth-title">Account created.</h1>
            <p className="auth-secondary" style={{ marginTop: 12, marginBottom: 24 }}>
              Your 5th Gear account is ready. Log in to manage your training and book sessions.
            </p>
            <button
              type="button"
              onClick={goToLogin}
              className="btn-primary auth-submit"
            >
              Log in
            </button>
            <button type="button" className="inline-link small" onClick={handleSupportClick} style={{ marginTop: 18 }}>
              Need help? Contact support
            </button>
          </section>
        </main>
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
                onClick={(e) => {
                  e.preventDefault();
                  handleNext("parent");
                }}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  textAlign: "left", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "999px",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#ffffff" }}>Parent Account</span>
                <span style={{ fontSize: 13, opacity: 0.9, color: "rgba(255, 255, 255, 0.9)" }}>Manage multiple players from one account</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext("player");
                }}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  textAlign: "left", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "999px",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#ffffff" }}>Player Account</span>
                <span style={{ fontSize: 13, opacity: 0.9, color: "rgba(255, 255, 255, 0.9)" }}>Individual player account</span>
              </button>
            </div>
          )}

          {/* Step 2: New/Returning Player (skip if Google signup) */}
          {currentStep === 2 && !isGoogleSignup && (
            <div className="auth-form" style={{ gap: 16 }}>
              <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                Are you a new or returning player?
              </p>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext(undefined, "new");
                }}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  textAlign: "left", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "999px",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: "#ffffff" }}>New Player</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext(undefined, "returning");
                }}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  textAlign: "left", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "999px",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: "#ffffff" }}>Returning Player</span>
              </button>

              <button type="button" onClick={handleBack} className="field-link" style={{ textAlign: "center", marginTop: 8 }}>
                ← Back
              </button>
            </div>
          )}

          {/* Step 3: Account Credentials */}
          {currentStep === 3 && (
            <div className="auth-form">
              <button
                type="button"
                onClick={handleGoogleSignup}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  background: "#ffffff",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "999px",
                  fontSize: "15px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 20,
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.2)" }}></div>
                <span style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.6)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.2)" }}></div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
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
            </div>
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

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <main className="auth-main">
          <section className="auth-panel">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          </section>
        </main>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
