"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientNavigation from "@/components/ClientNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        // No profile - redirect to complete account
        router.push("/complete-account");
        return;
      }
      
      if (profile.role !== "client") {
        // Not a client - redirect to appropriate portal based on role
        if (profile.role === "coach") {
          router.push("/dashboard");
        } else {
          router.push("/complete-account");
        }
        return;
      }

      setChecking(false);
    }

    checkRole();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
      </div>

      <ClientNavigation />

      <main className="relative z-10 flex items-center justify-center min-h-screen py-20">
        <div className="w-full max-w-4xl px-6 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}


