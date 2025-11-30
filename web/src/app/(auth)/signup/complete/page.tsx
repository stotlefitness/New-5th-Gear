"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = getSupabaseBrowserClient();

export default function SignupCompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleSignupComplete() {
      try {
        // Get the current user (should be authenticated after Google OAuth)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          // Not authenticated, go back to signup
          router.push("/signup");
          return;
        }

        // Get signup data from sessionStorage
        const accountType = typeof window !== "undefined" 
          ? sessionStorage.getItem("signup_account_type") 
          : null;
        const playerStatus = typeof window !== "undefined"
          ? sessionStorage.getItem("signup_player_status")
          : null;
        const parentName = typeof window !== "undefined"
          ? sessionStorage.getItem("signup_parent_name")
          : null;

        if (!accountType) {
          // No signup context, redirect to regular complete-account page
          router.push("/complete-account");
          return;
        }

        // Update user metadata with account type
        const fullName = accountType === "parent" && parentName 
          ? parentName 
          : user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            account_type: accountType,
            parent_name: accountType === "parent" ? parentName : undefined,
            role: "client",
          },
        });

        if (updateError) {
          console.error("Failed to update user metadata:", updateError);
        }

        // Clean up sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("signup_account_type");
          sessionStorage.removeItem("signup_player_status");
          sessionStorage.removeItem("signup_parent_name");
        }

        // Store account info in sessionStorage for the signup page to use
        if (typeof window !== "undefined") {
          sessionStorage.setItem("google_signup_account_type", accountType);
          sessionStorage.setItem("google_signup_player_status", playerStatus || "new");
          sessionStorage.setItem("google_signup_parent_name", parentName || "");
        }

        // Redirect to signup page at step 4 (player info)
        router.push("/signup?step=4");
      } catch (error) {
        console.error("Error in signup completion:", error);
        router.push("/signup");
      } finally {
        setLoading(false);
      }
    }

    handleSignupComplete();
  }, [router]);

  if (loading) {
    return (
      <div className="auth-page">
        <main className="auth-main">
          <section className="auth-panel">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return null;
}

