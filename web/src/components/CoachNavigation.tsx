"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR from "swr";

interface Profile {
  role: string;
}

async function fetchUnreadCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;

  // Count unread messages in conversations where current user is the coach
  // Unread = messages where sender_id != coach_id and read_at IS NULL
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", user.id);

  if (!conversations || conversations.length === 0) return 0;

  const conversationIds = conversations.map(c => c.id);

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

const coachLinks = [
  { href: "/dashboard", label: "Dashboard" },
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

  const { data: unreadCount = 0, mutate: mutateUnreadCount } = useSWR(
    profile?.role === "coach" ? "coach-unread-count" : null,
    fetchUnreadCount,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

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
        .maybeSingle();

      setProfile((data as Profile) ?? null);
      setLoading(false);
    });
  }, []);

  // Real-time subscription for unread messages (coach)
  useEffect(() => {
    if (profile?.role !== "coach") return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("coach-unread-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          mutateUnreadCount(); // Refresh unread count when messages change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, mutateUnreadCount]);

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

  const [menuOpen, setMenuOpen] = useState(false);

  if (loading || profile?.role !== "coach") return null;

  return (
    <header className="auth-nav" style={{ position: "relative" }}>
      <Link href="/dashboard" className="auth-logo">
        5TH GEAR
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-2">
        {coachLinks.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const showBadge = link.href === "/messages" && unreadCount > 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
              style={{ position: "relative" }}
            >
              {link.label}
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-8px",
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "2px 6px",
                    fontSize: "10px",
                    fontWeight: "600",
                    minWidth: "18px",
                    textAlign: "center",
                    lineHeight: "14px",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
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

      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden icon-btn"
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
        style={{ position: "relative", width: "32px", height: "32px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "16px", height: "16px", justifyContent: "center", alignItems: "center" }}>
          <span
            style={{
              display: "block",
              width: "16px",
              height: "1px",
              backgroundColor: "#ffffff",
              transition: "all 0.3s ease",
              transform: menuOpen ? "translateY(5px) rotate(45deg)" : "none",
            }}
          />
          <span
            style={{
              display: "block",
              width: "16px",
              height: "1px",
              backgroundColor: "#ffffff",
              transition: "opacity 0.3s ease",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: "block",
              width: "16px",
              height: "1px",
              backgroundColor: "#ffffff",
              transition: "all 0.3s ease",
              transform: menuOpen ? "translateY(-5px) rotate(-45deg)" : "none",
            }}
          />
        </div>
      </button>

      {/* Mobile Slide-Down Menu */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            zIndex: 1000,
            padding: "16px 18px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          }}
          className="md:hidden"
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {coachLinks.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              const showBadge = link.href === "/messages" && unreadCount > 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    position: "relative",
                    backgroundColor: active ? "#ffffff" : "rgba(255, 255, 255, 0.05)",
                    color: active ? "#020617" : "rgba(248, 250, 252, 0.9)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{link.label}</span>
                    {showBadge && (
                      <span
                        style={{
                          backgroundColor: "#ef4444",
                          color: "#ffffff",
                          borderRadius: "10px",
                          padding: "2px 6px",
                          fontSize: "10px",
                          fontWeight: "600",
                          minWidth: "18px",
                          textAlign: "center",
                          lineHeight: "14px",
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
            <button
              onClick={(e) => {
                setMenuOpen(false);
                signOut(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                signOut(e);
              }}
              type="button"
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "rgba(248, 250, 252, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
              }}
            >
              Logout →
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
