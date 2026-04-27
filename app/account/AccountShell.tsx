"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

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

export default function AccountShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const activeHref = useMemo(() => {
    if (!pathname) return "/account/profile";
    return pathname.startsWith("/account") ? pathname : "/account/profile";
  }, [pathname]);

  return (
    <div className="app-shell min-h-screen text-[var(--foreground)]">
      <div className="flex min-h-screen w-full">
        <aside
          className={`relative flex min-h-screen flex-col border-r border-[var(--border)] bg-[var(--surface-inverse)] px-6 py-10 text-white transition-all duration-300 ${
            collapsed ? "w-[92px]" : "w-[330px]"
          }`}
          aria-label="Account navigation"
        >
          <div className="flex items-center gap-4">
            <BrandMark href="/dashboard" compact light />
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Account</p>
                <p className="text-xs text-white/70">Manage your WintRides profile</p>
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
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-[var(--primary)]" : "text-white/85 hover:bg-white/10"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${
                      isActive ? "border-[var(--primary)] text-[var(--primary)]" : "border-white/30 text-white"
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
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-[var(--primary)]" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${
                      isActive ? "border-[var(--primary)] text-[var(--primary)]" : "border-white/30 text-white"
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
            className="absolute right-0 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center rounded-l-full border border-white/30 bg-[var(--primary)] text-white transition hover:bg-[var(--primary-hover)]"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
          >
            <span className="text-2xl leading-none">{collapsed ? ">" : "<"}</span>
          </button>
        </aside>

        <main className="flex-1 px-8 py-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="app-topbar mb-6 flex items-center justify-between rounded-[28px] px-5 py-4">
              <BrandMark href="/dashboard" />
              <Link href="/dashboard" className="btn-secondary px-4 py-2 text-sm">
                Back to rider dashboard
              </Link>
            </div>
            <div>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
