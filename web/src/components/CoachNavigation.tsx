"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Profile {
  role: string;
}

const coachLinks = [
  { href: "/availability", label: "Availability" },
  { href: "/requests", label: "Requests" },
  { href: "/lessons", label: "Lessons" },
  { href: "/messages", label: "Messages" },
  { href: "/settings", label: "Settings" },
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

  async function signOut(e?: React.MouseEvent | React.TouchEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading || profile?.role !== "coach") return null;

  return (
    <header className="auth-nav">
      <Link href="/availability" className="auth-logo">
        5TH GEAR
      </Link>

      <div className="flex items-center gap-2">
        {coachLinks.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}

        <button
          onClick={(e) => signOut(e)}
          onTouchEnd={(e) => {
            e.preventDefault();
            signOut(e);
          }}
          type="button"
          className="icon-btn"
          aria-label="Logout"
        >
          →
        </button>
      </div>
    </header>
  );
}
