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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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
        onClick={() => setMobileOpen(true)}
        className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md"
        aria-label="Open menu"
      >
        <span className="text-white/80 text-lg leading-none">≡</span>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />

          {/* Panel */}
          <div className="absolute right-4 top-4 w-[min(92vw,420px)] rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-xs tracking-[0.25em] text-white/70">5TH GEAR</div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/5 inline-flex items-center justify-center"
                aria-label="Close menu"
              >
                <span className="text-white/80 text-lg leading-none">✕</span>
              </button>
            </div>

            <nav className="p-3">
              <div className="flex flex-col gap-2">
                {clientLinks.map((link) => {
                  const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                  const showBadge = link.href === "/client/messages" && unreadCount > 0;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "rounded-xl px-4 py-3 text-sm tracking-widest uppercase",
                        "border border-white/10 bg-white/0 hover:bg-white/5 transition",
                        active ? "bg-white/10 border-white/20" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
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
                        ) : null}
                      </div>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={async (e) => {
                    setMobileOpen(false);
                    await signOut(e);
                  }}
                  className="mt-2 rounded-xl px-4 py-3 text-sm tracking-widest uppercase border border-white/10 bg-white/0 hover:bg-white/5 transition text-left"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

