"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Playfair_Display, Work_Sans } from "next/font/google";

// Define the fonts for consistency
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Define the pages under "Account" and links to their pages
const navItems = [
  {
    label: "Profile",
    href: "/account/profile",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c2.2-4 13.8-4 16 0" />
      </svg>
    ),
  },
  {
    label: "Driver Info",
    href: "/account/driver-info",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 13h15l3 3v4H2v-4l1-3Z" />
        <path d="M6 13 8 7h8l2 6" />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="16.5" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Reviews",
    href: "/account/reviews",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 4h10a2 2 0 0 1 2 2v12l-4-3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  {
    label: "Payments",
    href: "/account/payments",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    label: "Preferences",
    href: "/account/preferences",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.5.9Z" />
      </svg>
    ),
  },
];
// Defines the sign-out footer
const footerItems = [
  {
    label: "Sign out",
    href: "/account/signout",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M13 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        <path d="M7 12h10" />
        <path d="M10 9 7 12l3 3" />
      </svg>
    ),
  },
];

/* Wraps active child pages in the main content panel*/
export default function AccountShell({
  children,
}: {
  children: React.ReactNode;
}) {
  // stores the active path name
  const pathname = usePathname(); 
  const [collapsed, setCollapsed] = useState(false);
  // activeHref shows which account page the user is on
  // allows for aria-styling for active pages so screenreaders can read it
  const activeHref = useMemo(() => {
    if (!pathname) return "/account/profile";
    return pathname.startsWith("/account") ? pathname : "/account/profile";
  }, [pathname]);

  return (
    <div
      className={`min-h-screen bg-[#f1e8dc] text-[#0a1b3f] ${bodyFont.className}`}
      style={
        {
          "--account-blue": "#071a72",
          "--account-cream": "#f1e8dc",
          "--account-ink": "#0a1b3f",
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen w-full">
        <aside
          className={`relative flex min-h-screen flex-col bg-[var(--account-blue)] px-6 py-10 text-white transition-all duration-300 ${
            collapsed ? "w-[90px]" : "w-[330px]"
          }`}
          aria-label="Account navigation"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 text-sm font-semibold">
              WR
            </span>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Account</p>
                <p className="text-xs text-white/70">Personalize WintRides</p>
              </div>
            ) : null}
          </div>

          <nav className="mt-10 flex flex-1 flex-col gap-5">
            {navItems.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-[var(--account-blue)]" : "text-white/85 hover:bg-white/10"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${
                      isActive ? "border-[var(--account-blue)] text-[var(--account-blue)]" : "border-white/30 text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-white/20 pt-6">
            {footerItems.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-[var(--account-blue)]" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${
                      isActive ? "border-[var(--account-blue)] text-[var(--account-blue)]" : "border-white/30 text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="absolute right-0 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center rounded-l-full border border-white/30 bg-[var(--account-blue)] text-white transition hover:bg-[#0a268f]"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
          >
            <span className="text-2xl leading-none">{collapsed ? "›" : "‹"}</span>
          </button>
        </aside>

        <main className="flex-1 px-8 py-10 text-[var(--account-ink)]">
          <div className="mx-auto w-full max-w-5xl">
            {/* Back button for account pages, styled like the driver dashboard back control. */}
            <div className="mb-6">
              <Link
                href="/dashboard"
                className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0a3570] text-[#0a3570] hover:bg-[#e9dcc9]"
                aria-label="Back to dashboard"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            </div>
            <div className={displayFont.className}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
