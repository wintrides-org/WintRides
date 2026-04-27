"use client";

import Link from "next/link";

type DashboardUtilityNavProps = {
  showHome?: boolean;
  homeHref?: string;
  showNotifications?: boolean;
};

export default function DashboardUtilityNav({
  showHome = false,
  homeHref = "/dashboard",
  showNotifications = false,
}: DashboardUtilityNavProps) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account/profile"
        aria-label="Account"
        className="icon-button"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c2.2-4 13.8-4 16 0" />
        </svg>
      </Link>

      <Link
        href="/in-progress"
        aria-label="Settings"
        className="icon-button"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.5.9Z" />
        </svg>
      </Link>

      {showHome ? (
        <Link
          href={homeHref}
          aria-label="Home"
          className="icon-button"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
          </svg>
        </Link>
      ) : null}

      <Link
        href="/help"
        aria-label="Help"
        className="icon-button"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
          <circle cx="12" cy="17" r="1" />
        </svg>
      </Link>

      {showNotifications ? (
        <Link
          href="/in-progress"
          aria-label="Notifications"
          className="icon-button relative"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
            <path d="M9 18a3 3 0 0 0 6 0" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
