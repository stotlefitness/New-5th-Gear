"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      // Check profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      // Handle case where profile doesn't exist (404) or other errors
      if (profileError || !profile) {
        // No profile - redirect to complete account
        if (pathname !== "/complete-account") {
          router.push("/complete-account");
        }
        return;
      }

      // For coaches, profile existence is enough (no player_name needed)
      if (profile.role === "coach") {
        setChecking(false);
        return;
      }

      // For clients, check if they have account_type and player_name
      const meta = data.user.user_metadata || {};
      const isComplete = meta.account_type && meta.player_name;

      if (!isComplete && pathname !== "/complete-account") {
        router.push("/complete-account");
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
