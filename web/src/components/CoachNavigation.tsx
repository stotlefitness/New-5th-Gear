"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Profile {
  role: string;
}

const coachLinks = [
  { href: "/coach/availability", label: "Availability" },
  { href: "/coach/requests", label: "Requests" },
  { href: "/coach/lessons", label: "Lessons" },
  { href: "/coach/messages", label: "Messages" },
  { href: "/coach/settings", label: "Settings" },
];

export default function CoachNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setProfile((data as Profile) ?? null);
      setLoading(false);
    });
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading || profile?.role !== "coach") return null;

  return (
    <header className="coach-nav">
      <div className="coach-nav-left">
        <Link href="/coach/availability" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="coach-logo-main">5TH</span>
          <span className="coach-logo-sub">Coach Console</span>
        </Link>
      </div>

      <nav className="coach-nav-right">
        {coachLinks.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`coach-nav-pill ${active ? "coach-nav-pill--active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}

        <button
          onClick={signOut}
          className="coach-nav-pill coach-nav-pill--ghost"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
