"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import ClientNavigation from "@/components/ClientNavigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export function ClientPageWrapper({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "client") {
        router.push("/availability");
        return;
      }

      setRole(profile.role);
      setChecking(false);
    }

    checkRole();
  }, [router]);

  if (checking || role !== "client") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="coach-page-inner">
            <div className="coach-header">
              <div className="coach-header-label">Client portal</div>
              <h1 className="coach-header-title">{title}</h1>
              <p className="coach-header-subtitle">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
