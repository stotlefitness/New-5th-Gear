"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function HomeAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile lookup error:", error);
        setReady(true);
        return;
      }

      if (data?.role === "coach") {
        router.replace("/dashboard");
        return;
      }
      if (data?.role === "client") {
        router.replace("/client/dashboard");
        return;
      }
      if (!data) {
        router.replace("/complete-account");
        return;
      }

      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
