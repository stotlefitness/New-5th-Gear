"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  onLogout?: () => void | Promise<void>;
  unreadCount?: number;
  badgeHref?: string;
}

export function MobileMenu({
  open,
  onClose,
  navItems,
  onLogout,
  unreadCount = 0,
  badgeHref,
}: MobileMenuProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  // Close on route change
  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Panel */}
      <div className="absolute right-4 top-4 w-[min(92vw,420px)] rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-xs tracking-[0.25em] text-white/70">5TH GEAR</div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/5 inline-flex items-center justify-center"
            aria-label="Close"
          >
            <span className="text-white/80 text-lg leading-none">✕</span>
          </button>
        </div>

        <nav className="p-3">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const showBadge = badgeHref && item.href === badgeHref && unreadCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "rounded-xl px-4 py-3 text-sm tracking-widest uppercase",
                    "border border-white/10 bg-white/0 hover:bg-white/5 transition",
                    active ? "bg-white/10 border-white/20" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
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

            {onLogout && (
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await onLogout();
                }}
                className="mt-2 rounded-xl px-4 py-3 text-sm tracking-widest uppercase border border-white/10 bg-white/0 hover:bg-white/5 transition text-left"
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>,
    document.body
  );
}
