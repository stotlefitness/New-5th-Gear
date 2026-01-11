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
        onClick={() => setMenuOpen(true)}
        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-xl"
        aria-label="Open menu"
      >
        <span className="text-white/80 text-lg leading-none">≡</span>
      </button>

      {/* Mobile Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Dim backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[86vw] max-w-[380px] border-l border-white/10 bg-[#0b1020]/60 backdrop-blur-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="tracking-[0.35em] text-xs text-white/70">5TH GEAR</div>
              <button
                onClick={() => setMenuOpen(false)}
                className="h-10 w-10 rounded-full border border-white/20 bg-white/5 inline-flex items-center justify-center"
                aria-label="Close menu"
              >
                <span className="text-white/80 text-lg leading-none">×</span>
              </button>
            </div>

            <nav className="p-3 flex flex-col gap-2 flex-1">
              <div className="space-y-2">
                {clientLinks.map((link) => {
                  const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                  const showBadge = link.href === "/client/messages" && unreadCount > 0;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={[
                        "flex items-center justify-between w-full rounded-2xl px-4 py-4",
                        "border border-white/10 bg-white/5",
                        "text-sm tracking-[0.25em] uppercase",
                        active ? "text-white bg-white/10" : "text-white/80 hover:bg-white/10",
                      ].join(" ")}
                    >
                      <span>{link.label}</span>
                      {showBadge ? (
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
                      ) : (
                        <span className="text-white/30">→</span>
                      )}
                    </Link>
                  );
                })}
              </div>

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
                className="mt-auto flex items-center justify-between w-full rounded-2xl px-4 py-4 border border-white/10 bg-white/5 text-sm tracking-[0.25em] uppercase text-white/80 hover:bg-white/10"
              >
                <span>Logout</span>
                <span className="text-white/30">→</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

