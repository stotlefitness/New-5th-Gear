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

  // Count unread messages in conversations where current user is the client
  // Unread = messages where sender_id != client_id and read_at IS NULL
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", user.id)
    .maybeSingle();

  if (!conversation) return 0;

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

const clientLinks = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/book", label: "Sessions" },
  { href: "/client/requests", label: "Requests" },
  { href: "/client/lessons", label: "Lessons" },
  { href: "/client/messages", label: "Messages" },
  { href: "/client/settings", label: "Settings" },
];

export default function ClientNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unreadCount = 0, mutate: mutateUnreadCount } = useSWR(
    profile?.role === "client" ? "client-unread-count" : null,
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

  // Real-time subscription for unread messages (client)
  useEffect(() => {
    if (profile?.role !== "client") return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("client-unread-messages")
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [menuOpen]);

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

  if (loading || profile?.role !== "client") return null;

  return (
    <header className="auth-nav" style={{ position: "relative" }}>
      <Link href="/client/dashboard" className="auth-logo">
        5TH GEAR
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-2">
        {clientLinks.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const showBadge = link.href === "/client/messages" && unreadCount > 0;
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

      {/* Mobile Full-Screen Overlay Menu */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "56px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            zIndex: 50,
            overflowY: "auto",
          }}
          className="md:hidden"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              maxWidth: "100%",
              padding: "16px 18px",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                color: "rgba(148, 163, 184, 0.6)",
                marginBottom: "12px",
              }}
            >
              CLIENT PORTAL
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              {clientLinks.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                const showBadge = link.href === "/client/messages" && unreadCount > 0;
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
                  marginTop: "auto",
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
        </div>
      )}
    </header>
  );
}

